#!/usr/bin/env node
// One port for the whole demo: serves the built app (dist/, from `pnpm build`) and forwards the
// page's API calls (`/api/*`, `/v1/*`, including the transcription WebSocket) to a NeuroLink server,
// so the page and the API share an origin. That is what a public deployment wants: one hostname on
// the tunnel, no CORS, no key in the page.
//
//   NEUROLINK_URL=http://127.0.0.1:8788 PORT=8765 HOST=0.0.0.0 node serve.mjs
//
// Text to speech and voice cloning (the Speak tab) go to an OpenAI-compatible TTS gateway under
// `/tts/*`, with the gateway key held here, never in the page:
//
//   TTS_BASE_URL=https://<litellm-gateway> TTS_API_KEY=sk-... TTS_MODEL=s2-pro node serve.mjs
import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { connect } from "node:net";
import { connect as tlsConnect } from "node:tls";
import { copyFileSync, createReadStream, existsSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// The React app builds into dist/; public/ is its static source (config.js, whistle/, illustrations/).
const PUBLIC = existsSync(join(here, "dist", "index.html"))
  ? join(here, "dist")
  : join(here, "public");
const PORT = Number(process.env.PORT ?? 8765);
const HOST = process.env.HOST ?? "127.0.0.1";
const TARGET = new URL(process.env.NEUROLINK_URL ?? "http://127.0.0.1:8788");
if (TARGET.protocol !== "http:" && TARGET.protocol !== "https:") {
  throw new Error(`NEUROLINK_URL must be http(s), got ${TARGET.protocol}`);
}
const TARGET_TLS = TARGET.protocol === "https:";
const TARGET_PORT = Number(TARGET.port || (TARGET_TLS ? 443 : 80));
const PROXIED = ["/api/", "/v1/"];
const TTS = process.env.TTS_BASE_URL
  ? new URL(process.env.TTS_BASE_URL.replace(/\/$/, ""))
  : null;
const TTS_KEY = process.env.TTS_API_KEY ?? "";
const TTS_MODEL = process.env.TTS_MODEL ?? "s2-pro";

// Whistle runs in the browser from the same three files NeuroLink ships.
for (const f of ["needle.js", "needle.wasm", "whistle.cact"]) {
  const dst = join(PUBLIC, "whistle", f);
  const src = join(here, "..", "..", "models", "whistle", f);
  if (!existsSync(dst) && existsSync(src) && existsSync(dirname(dst))) {
    copyFileSync(src, dst);
  }
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".cact": "application/octet-stream",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function isProxied(url) {
  return PROXIED.some((p) => url === p.slice(0, -1) || url.startsWith(p));
}

function serveStatic(req, res) {
  let pathOnly;
  try {
    pathOnly = decodeURIComponent((req.url ?? "/").split("?", 1)[0]);
  } catch {
    // a malformed escape such as `/%` must not take the server down
    res.writeHead(400, { "content-type": "text/plain" }).end("bad request");
    return;
  }
  let file = resolve(PUBLIC, "." + normalize("/" + pathOnly));
  if (!file.startsWith(PUBLIC + sep) && file !== PUBLIC) {
    res.writeHead(403).end();
    return;
  }
  try {
    if (statSync(file).isDirectory()) {
      file = join(file, "index.html");
    }
    const size = statSync(file).size;
    res.writeHead(200, {
      "content-type":
        TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
      "content-length": size,
      "cache-control": file.includes(`${sep}assets${sep}`)
        ? "public, max-age=31536000, immutable"
        : file.includes(`${sep}whistle${sep}`) ||
            file.includes(`${sep}illustrations${sep}`)
          ? "public, max-age=86400"
          : "no-cache",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found");
  }
}

function proxy(req, res) {
  const upstream = (TARGET_TLS ? httpsRequest : httpRequest)(
    {
      host: TARGET.hostname,
      port: TARGET_PORT,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: TARGET.host },
    },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on("error", (error) => {
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "application/json" });
    }
    res.end(
      JSON.stringify({
        error: `NeuroLink server unreachable: ${error.message}`,
      }),
    );
  });
  req.pipe(upstream);
}

// Only the two calls the Speak tab makes are passed on, and speech always uses TTS_MODEL, so the
// gateway key cannot be borrowed for anything else.
const TTS_ROUTES = new Map([
  ["/tts/v1/audio/speech", ["POST"]],
  ["/tts/s2pro/voices", ["GET", "POST"]],
]);

async function readBody(req, limit) {
  const parts = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("body too large");
    parts.push(chunk);
  }
  return Buffer.concat(parts);
}

// The page cannot hold a secret, so the /tts routes accept only the page itself: a browser request
// from this origin. It stops other sites from spending the gateway key; it is not authentication,
// so a publicly reachable deployment still needs access control in front of it (see README).
function fromThisPage(req) {
  const site = req.headers["sec-fetch-site"];
  if (site) return site === "same-origin";
  const hosts = [req.headers.host, req.headers["x-forwarded-host"]].filter(
    Boolean,
  );
  const from = req.headers.origin ?? req.headers.referer;
  if (!from) return false;
  try {
    return hosts.includes(new URL(from).host);
  } catch {
    return false;
  }
}

async function ttsProxy(req, res) {
  const path = (req.url ?? "/").split("?", 1)[0];
  const methods = TTS_ROUTES.get(path);
  if (!TTS) {
    res.writeHead(503, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        error: { message: "text to speech is not configured (TTS_BASE_URL)" },
      }),
    );
    return;
  }
  if (!fromThisPage(req)) {
    res
      .writeHead(403, { "content-type": "application/json" })
      .end(JSON.stringify({ error: { message: "forbidden" } }));
    return;
  }
  if (!methods || !methods.includes(req.method ?? "GET")) {
    res
      .writeHead(404, { "content-type": "application/json" })
      .end(JSON.stringify({ error: { message: "not found" } }));
    return;
  }
  try {
    let body =
      req.method === "GET" ? undefined : await readBody(req, 40 * 1024 * 1024);
    const headers = { authorization: `Bearer ${TTS_KEY}` };
    if (req.headers["content-type"])
      headers["content-type"] = req.headers["content-type"];
    if (path === "/tts/v1/audio/speech") {
      const json = JSON.parse(body.toString("utf8"));
      body = Buffer.from(JSON.stringify({ ...json, model: TTS_MODEL }));
      headers["content-type"] = "application/json";
    }
    const up = await fetch(TTS.href.replace(/\/$/, "") + path.slice(4), {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(180000),
    });
    const out = Buffer.from(await up.arrayBuffer());
    res.writeHead(up.status, {
      "content-type":
        up.headers.get("content-type") ?? "application/octet-stream",
      "content-length": out.length,
    });
    res.end(out);
  } catch (error) {
    if (!res.headersSent)
      res.writeHead(502, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ error: { message: `TTS gateway: ${error.message}` } }),
    );
  }
}

const server = createServer((req, res) => {
  if ((req.url ?? "").startsWith("/tts/")) {
    void ttsProxy(req, res);
  } else if (isProxied(req.url ?? "/")) {
    proxy(req, res);
  } else {
    serveStatic(req, res);
  }
});

// WebSocket upgrades: hand the raw socket to the NeuroLink server as is.
server.on("upgrade", (req, socket, head) => {
  if (!isProxied(req.url ?? "/")) {
    socket.destroy();
    return;
  }
  const onConnect = () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (const [name, value] of Object.entries({
      ...req.headers,
      host: TARGET.host,
    })) {
      for (const v of Array.isArray(value) ? value : [value]) {
        lines.push(`${name}: ${v}`);
      }
    }
    upstream.write(lines.join("\r\n") + "\r\n\r\n");
    if (head.length) {
      upstream.write(head);
    }
    socket.pipe(upstream).pipe(socket);
  };
  // TLS when NEUROLINK_URL is https, so the WebSocket reaches a secure target too
  const upstream = TARGET_TLS
    ? tlsConnect(
        {
          host: TARGET.hostname,
          port: TARGET_PORT,
          servername: TARGET.hostname,
        },
        onConnect,
      )
    : connect(TARGET_PORT, TARGET.hostname, onConnect);
  const drop = () => {
    socket.destroy();
    upstream.destroy();
  };
  upstream.on("error", drop);
  socket.on("error", drop);
});

server.listen(PORT, HOST, () => {
  console.log(
    `voice bench on http://${HOST}:${PORT}  →  API ${TARGET.origin}${TTS ? `  ·  TTS ${TTS.host} (${TTS_MODEL})` : ""}`,
  );
});
