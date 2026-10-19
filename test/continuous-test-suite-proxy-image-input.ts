#!/usr/bin/env tsx
/**
 * Continuous Test Suite: the proxy's client image references, end to end.
 *
 * The proxy's OpenAI (`/v1/chat/completions`), Gemini (`:generateContent`,
 * `:streamGenerateContent`) and Claude (`/v1/messages`, once a model is routed
 * to another provider) routes copy whatever a client put in an image slot into
 * `input.images`, and the SDK resolves a string itself: an `http(s)` URL is
 * fetched (redirects followed, no address check) and anything else that names
 * an existing file is read from the local disk and sent upstream. The main
 * port listens on loopback with no credentials by default, and the share port
 * admits any holder of a share token. Neither caller may aim the proxy at its
 * own disk or network.
 *
 * Every case drives a surface this package ships (CLAUDE.md rule 15): the built
 * CLI, `node dist/cli/index.js proxy start --dev`, in a temp HOME and cwd,
 * routed through `routing.model-mappings` to an OpenAI-compatible stub that
 * records every request body it receives. Nothing leaves the machine: the stub
 * and the URL listener are on loopback, and the credentials are fake.
 *
 * Four doors are driven: OpenAI, Gemini and Claude (each routed to the stub),
 * and the Claude route's other way into translation, a `claude-*` model with no
 * Anthropic account that falls through to the configured fallback chain. That
 * leg builds its SDK options on a different code path from a routed model, so
 * it gets its own cases. The same cases then run through the share port with a
 * share token, because that port serves the same routes to any token holder.
 *
 * What is checked, per door and for streaming and non-streaming alike:
 *   - a local path (an image, a `.txt`, an extensionless file) is refused with
 *     a 400 in the door's own error format, and its bytes never reach the stub;
 *   - a path that does not exist gets the byte-identical answer, so the route
 *     is not an oracle for which files exist;
 *   - an `http://` URL and a loopback `https://` URL are refused while a TCP
 *     listener standing in for "an internal service" counts zero connections;
 *   - a `data:` URI still reaches the stub byte for byte, and a text-only
 *     request is unchanged.
 *
 * Gemini has a form of its own. Google's `inlineData` carries raw base64 in
 * `data` and the type in a sibling `mimeType`, so the proxy wraps raw base64 of
 * an `image/*` type into a `data:` URI before the vetter sees it. The Gemini
 * cases check that it arrives as the client's own bytes (standard and URL-safe
 * base64, streaming and not), that base64 of any other type or with a malformed
 * image type is still refused without echoing it, that base64 of an impossible
 * length or with inconsistent padding is refused locally rather than wrapped,
 * that a path in `data` is never read (a string of base64 characters of a
 * decodable length is wrapped like any other bytes, and then refused because the
 * bytes are not an image; anything else is refused as before), and that the
 * 20-image limit counts converted images.
 *
 * Inline bytes are verified, not trusted. Every `data:` image is decoded
 * strictly from base64 and its bytes must be a recognised image, whatever the
 * client declared:
 *   - PNG, JPEG, WebP and GIF reach the stub byte for byte under their own type,
 *     through every door (a `data:` URI, a Claude base64 source, Gemini raw
 *     base64), and the URL-safe and unpadded alphabets reach it as standard base64;
 *   - bytes declared as the wrong type (a JPEG as `image/png`, a type that is not
 *     an image at all) reach the stub under the type they have;
 *   - text, a path, HTML, PDF, SVG, ZIP, a non-image ISO-BMFF file, NULs and
 *     every signature cut short are refused with `invalid_image_data` before any
 *     stream starts, without echoing the data, and never reach the stub;
 *   - a `data:` URI that is not base64, has no payload or carries an impossible
 *     length, alphabet or padding is refused the same way;
 *   - HEIC, HEIF, AVIF, BMP, TIFF, ICO and JPEG 2000 are accepted: the SDK
 *     converts them to PNG when sharp or ffmpeg can read the file (for every
 *     provider, Google included) and otherwise sends the original bytes under
 *     their detected type, so what the stub receives is the SDK's PNG or the
 *     original bytes under their type. The fixtures are not decodable files, so
 *     here it is the second.
 *
 * An image slot that carries nothing is refused, never skipped. Each door's
 * empty inline payload (a Claude `base64` source or a Gemini `inlineData` of an
 * image type whose `data` is empty or absent) is `invalid_image_data`, and an
 * empty URL (OpenAI `image_url.url`, Claude `url` source) is
 * `invalid_image_reference`, streaming and not, while the same request without
 * the empty image is served. A Gemini part with no `inlineData`, or one that
 * declares no image type, and a Claude block whose source is neither base64 nor
 * a URL, are left out as before.
 *
 * Two controls make the negatives mean something. The URL listener is proven
 * to count a connection before any zero is read, and the stub is proven to
 * receive a canary the proxy was handed legitimately (as a `data:` URI) before
 * "the stub never saw the canary" is read as a result.
 *
 * Downloads go through a second proxy started with `HTTPS_PROXY` pointing at a
 * loopback CONNECT proxy that tunnels to a local TLS origin (behind a proxy only
 * the URL text is vetted, so a public-looking name passes and nothing is
 * resolved or contacted; the origin's throwaway certificate, generated with
 * `openssl`, is trusted only by that child through `NODE_EXTRA_CA_CERTS`). The
 * origin answers named paths:
 *   - an image reaches the stub byte for byte, and a JPEG served as `image/png`
 *     reaches it as `image/jpeg`;
 *   - a page, text served as `image/png` and an empty body are refused with
 *     `invalid_image_data`, and the stub never sees them;
 *   - a client that disconnects while a download is in flight must stop it: the
 *     origin accepts the request and never answers, the case waits for the origin
 *     to receive it, drops the client, and requires the origin's connection to
 *     close well inside `safeDownload`'s 60 s timeout.
 *
 * What this suite cannot reach: a redirect to a private address, which needs a
 * publicly routable https host. `safeDownload` itself (address pinning,
 * redirect refusal, size cap) is the helper the agent routes and the
 * transcription route already rely on, covered by
 * test/continuous-test-suite-agent-input-guard.ts. The signal check *between*
 * two references (stop before starting the next one) has no deterministic case
 * here either: it needs a download that finishes just before the client goes.
 *
 * Point the suite at another build with NEUROLINK_PROXY_IMAGE_INPUT_CLI to
 * prove the security cases fail against one without the guard.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-proxy-image-input.ts
 * Requires: built CLI (pnpm run build)
 */
import {
  execFile,
  execFileSync,
  spawn,
  type ChildProcess,
} from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import {
  createServer as createHttpServer,
  type Server as HttpServer,
} from "node:http";
import { connect, createServer as createTcpServer } from "node:net";
import {
  createServer as createHttpsServer,
  type Server as HttpsServer,
} from "node:https";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { assert, assertEqual, defineSuite, Skip } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

const CLI_OVERRIDE = process.env.NEUROLINK_PROXY_IMAGE_INPUT_CLI;
if (!CLI_OVERRIDE) {
  assertDistFresh({ entrypoints: ["dist/cli/index.js"] });
}
const CLI = CLI_OVERRIDE ?? resolve("dist/cli/index.js");

const execFileAsync = promisify(execFile);
const { test, runSuite } = defineSuite("Proxy: client image references", {
  offline: true,
  perTestTimeoutMs: 90_000,
});

// The three wire formats, plus the Claude route's other way into translation:
// a claude-* model with no Anthropic account falls through to the configured
// fallback chain, which builds its SDK options on a different code path from a
// model that is routed outright.
type Door = "openai" | "gemini" | "claude" | "claude-fallback";
const DOORS: readonly Door[] = [
  "openai",
  "gemini",
  "claude",
  "claude-fallback",
];
const MODEL: Record<Door, string> = {
  openai: "probe-oai",
  gemini: "probe-gemini",
  claude: "probe-claude",
  "claude-fallback": "claude-sonnet-4-5",
};

// A syntactically valid 1x1 PNG, the same one the agent-input suite uses.
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
const PNG_MAGIC = PNG_BYTES.subarray(0, 8);

// Real 1x1 images of the other three formats every provider takes. macOS `sips`
// and `file` read each of them; only their signature matters to the proxy.
const JPEG_BYTES = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);
const WEBP_BYTES = Buffer.from(
  "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==",
  "base64",
);
const GIF_BYTES = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

// What the SDK accepts as input but no provider takes as it is (BMP, TIFF, ICO,
// JPEG 2000, AVIF) or only Google does (HEIC, HEIF). Only the opening bytes are
// a real file's, so the SDK's converter cannot decode them and falls back to
// sending them unchanged; a decoder that can is told apart by the PNG it makes.
const filler = (length: number): Buffer =>
  Buffer.alloc(length, 0x20 + (length % 64));
const ftypBox = (brand: string, compatible: readonly string[]): Buffer => {
  const box = Buffer.alloc(16 + 4 * compatible.length);
  box.writeUInt32BE(box.length, 0);
  box.write("ftyp", 4, "latin1");
  box.write(brand, 8, "latin1");
  compatible.forEach((entry, index) =>
    box.write(entry, 16 + 4 * index, "latin1"),
  );
  return Buffer.concat([box, filler(48)]);
};
const bmpBytes = (): Buffer => {
  const dib = Buffer.alloc(40);
  dib.writeUInt32LE(40, 0);
  dib.writeInt32LE(1, 4);
  dib.writeInt32LE(1, 8);
  dib.writeUInt16LE(1, 12);
  dib.writeUInt16LE(24, 14);
  dib.writeUInt32LE(4, 20);
  const file = Buffer.alloc(14);
  file.write("BM", 0, "latin1");
  file.writeUInt32LE(14 + 40 + 4, 2);
  file.writeUInt32LE(14 + 40, 10);
  return Buffer.concat([file, dib, Buffer.from([0xff, 0x00, 0x00, 0x00])]);
};
const icoBytes = (): Buffer => {
  const header = Buffer.from([0, 0, 1, 0, 1, 0]);
  const entry = Buffer.from([1, 1, 0, 0, 1, 0, 32, 0, 4, 0, 0, 0, 22, 0, 0, 0]);
  return Buffer.concat([header, entry, filler(16)]);
};
const CONVERTIBLE_IMAGES: ReadonlyArray<{
  name: string;
  type: string;
  bytes: Buffer;
}> = [
  {
    name: "HEIC",
    type: "image/heic",
    bytes: ftypBox("heic", ["mif1", "heic"]),
  },
  {
    name: "HEIF",
    type: "image/heif",
    bytes: ftypBox("mif1", ["mif1", "heic"]),
  },
  {
    name: "AVIF",
    type: "image/avif",
    bytes: ftypBox("avif", ["mif1", "avif"]),
  },
  { name: "BMP", type: "image/bmp", bytes: bmpBytes() },
  {
    name: "TIFF",
    type: "image/tiff",
    bytes: Buffer.concat([
      Buffer.from([0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0]),
      filler(32),
    ]),
  },
  { name: "ICO", type: "image/x-icon", bytes: icoBytes() },
  {
    name: "JPEG 2000",
    type: "image/jp2",
    bytes: Buffer.concat([
      Buffer.from([
        0, 0, 0, 0x0c, 0x6a, 0x50, 0x20, 0x20, 0x0d, 0x0a, 0x87, 0x0a,
      ]),
      filler(32),
    ]),
  },
];

const token = (): string => `CANARY_${randomBytes(12).toString("hex")}`;

// What the Gemini parser takes for raw base64: Google's JSON `bytes` fields hold
// standard or URL-safe base64. A string of these characters is bytes to it,
// whatever it looks like to a person, as long as its length is one a decoder
// takes (one character over a multiple of four is none) and any `=` is the
// padding that length calls for.
const BYTES_ONLY = /^[A-Za-z0-9+/_-]+={0,2}$/;
const takenForBytes = (value: string): boolean => {
  if (!BYTES_ONLY.test(value)) {
    return false;
  }
  const body = value.replace(/=+$/, "");
  const padding = value.length - body.length;
  const missing = (4 - (body.length % 4)) % 4;
  return missing !== 3 && (padding === 0 || padding === missing);
};

// ---------------------------------------------------------------- scratch dir
const ROOT = mkdtempSync(join(tmpdir(), "neurolink-proxy-image-input-"));
const HOME = join(ROOT, "home");
const CWD = join(ROOT, "cwd");
const FILES = join(ROOT, "files");
const HOME_HELD = join(ROOT, "home-held");
for (const dir of [HOME, HOME_HELD, CWD, FILES, join(ROOT, "tmp")]) {
  mkdirSync(dir, { recursive: true });
}

const canaries = {
  png: { token: token(), file: join(FILES, "canary-image.png") },
  txt: { token: token(), file: join(FILES, "canary-secret.txt") },
  noext: { token: token(), file: join(FILES, "canary-secret-noext") },
  dataUri: { token: token() },
  rawBase64: { token: token() },
  nonImage: { token: token() },
  served: { token: token() },
  prompt: { token: token(), file: join(FILES, "mentioned-in-prompt.txt") },
  // Relative to the proxy's cwd and made of letters only, so it reads as base64
  // wherever the temp directory happens to be.
  relative: { token: token(), file: "canaryrelativefile" },
};
writeFileSync(
  canaries.png.file,
  Buffer.concat([PNG_MAGIC, Buffer.from(canaries.png.token)]),
);
writeFileSync(canaries.txt.file, `API_SECRET=${canaries.txt.token}\n`);
writeFileSync(canaries.noext.file, `${canaries.noext.token}\n`);
writeFileSync(canaries.prompt.file, `${canaries.prompt.token}\n`);
writeFileSync(
  join(CWD, canaries.relative.file),
  `${canaries.relative.token}\n`,
);
const MISSING = join(FILES, "does-not-exist.png");
const CONFIG_PATH = join(ROOT, "proxy-config.yaml");

// ------------------------------------------------------------------ stub server
type StubRecord = { method: string; url: string; raw: string };
const stubRequests: StubRecord[] = [];
const chatPosts = (): StubRecord[] =>
  stubRequests.filter(
    (r) => r.method === "POST" && /chat\/completions\/?$/.test(r.url),
  );

const USAGE = { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 };

/** An OpenAI-compatible upstream that records every body it is sent. */
const stub: HttpServer = createHttpServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    stubRequests.push({ method: req.method ?? "", url: req.url ?? "", raw });
    if (req.method === "GET" && /\/models\/?$/.test(req.url ?? "")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          object: "list",
          data: [{ id: "gpt-4o", object: "model" }],
        }),
      );
      return;
    }
    if (req.method === "POST" && /chat\/completions\/?$/.test(req.url ?? "")) {
      const wantsStream = (() => {
        try {
          return (JSON.parse(raw) as { stream?: boolean }).stream === true;
        } catch {
          return false;
        }
      })();
      const base = {
        id: "stub-1",
        object: wantsStream ? "chat.completion.chunk" : "chat.completion",
        created: 0,
        model: "gpt-4o",
      };
      if (wantsStream) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write(
          `data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: { role: "assistant", content: "stub-ok" }, finish_reason: null }] })}\n\n`,
        );
        res.write(
          `data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: USAGE })}\n\n`,
        );
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          ...base,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "stub-ok" },
              finish_reason: "stop",
            },
          ],
          usage: USAGE,
        }),
      );
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: "stub: not found" } }));
  });
});

// ------------------------------------------------------------------ URL listener
// Counts TCP connections, not just HTTP requests, so a fetch that dies before
// it sends a request line is still counted.
const listener = { connections: 0, requests: [] as string[] };
const listenerServer: HttpServer = createHttpServer((req, res) => {
  listener.requests.push(`${req.method} ${req.url}`);
  res.writeHead(200, {
    "content-type": "image/png",
    "content-length": PNG_BYTES.length,
    connection: "close",
  });
  res.end(PNG_BYTES);
});
listenerServer.on("connection", (socket) => {
  listener.connections += 1;
  socket.on("error", () => undefined);
});

// ------------------------------------------------------------ TLS origin
// A CONNECT proxy that tunnels to a local TLS origin. The origin answers the
// named paths below and reads `/hold.png` without ever answering, so that
// download stays in flight until something cancels it. Built by the first case
// that needs it, and shared by the rest.
type HeldRequest = { url: string; closed: boolean };
const heldRequests: HeldRequest[] = [];
const servedPaths: string[] = [];
const heldConnects: string[] = [];
const heldLog: string[] = [];
const HELD_HOST = "images.example.com";
let heldOrigin: HttpsServer | undefined;
let heldTunnel: HttpServer | undefined;

// A JPEG that the origin labels `image/png`, and text it labels as an image.
const SERVED_TEXT = Buffer.from(`not an image ${canaries.served.token}`);
const SERVED: Record<string, { type: string; body: Buffer }> = {
  "/ok.png": { type: "image/png", body: PNG_BYTES },
  "/photo.jpg": { type: "image/jpeg", body: JPEG_BYTES },
  "/mislabelled.png": { type: "image/png", body: JPEG_BYTES },
  "/page.html": {
    type: "text/html",
    body: Buffer.from(`<html>${canaries.served.token}</html>`),
  },
  "/text.png": { type: "image/png", body: SERVED_TEXT },
  "/empty.png": { type: "image/png", body: Buffer.alloc(0) },
};

const listen = (server: HttpServer): Promise<number> =>
  new Promise((resolvePort) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolvePort(typeof address === "object" && address ? address.port : 0);
    });
  });

async function freePort(): Promise<number> {
  const probe = createTcpServer();
  const port = await new Promise<number>((resolvePort) => {
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      resolvePort(typeof address === "object" && address ? address.port : 0);
    });
  });
  await new Promise<void>((done) => probe.close(() => done()));
  return port;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

// ------------------------------------------------------------------ proxy child
let proxy: ChildProcess | undefined;
let heldProxy: ChildProcess | undefined;
let mainPort = 0;
let sharePort = 0;
let shareToken = "";
const proxyLog: string[] = [];

function childEnv(
  stubPort: number,
  home: string = HOME,
  extra: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
  // Built from nothing rather than from process.env, so no ambient credential
  // or proxy setting can reach the child.
  return {
    PATH: process.env.PATH,
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: join(home, ".config"),
    TMPDIR: join(ROOT, "tmp"),
    OPENAI_BASE_URL: `http://127.0.0.1:${stubPort}/v1`,
    // Shaped like a real key so the fallback chain's availability check, which
    // rejects a malformed one, lets the stub be tried. It authorizes nothing.
    OPENAI_API_KEY: `sk-${"a".repeat(48)}`,
    OTEL_SDK_DISABLED: "true",
    NEUROLINK_SKIP_MCP: "true",
    NEUROLINK_PROXY_IGNORE_LAUNCHD: "1",
    ...extra,
  };
}

async function cli(args: string[], env: NodeJS.ProcessEnv): Promise<string> {
  const { stdout } = await execFileAsync(process.execPath, [CLI, ...args], {
    cwd: CWD,
    env,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

function writeProxyConfig(): void {
  writeFileSync(
    CONFIG_PATH,
    [
      "routing:",
      "  model-mappings:",
      ...DOORS.filter((door) => door !== "claude-fallback").map(
        (door) =>
          `    - { from: ${MODEL[door]}, to: gpt-4o, provider: openai }`,
      ),
      "  fallback-chain:",
      "    - { provider: openai, model: gpt-4o }",
      "",
    ].join("\n"),
  );
}

/** Spawn `proxy start --dev` and wait until every port in `ports` is healthy. */
async function launchProxy(
  env: NodeJS.ProcessEnv,
  ports: { main: number; share?: number },
  log: string[],
): Promise<ChildProcess> {
  const child = spawn(
    process.execPath,
    [
      CLI,
      "proxy",
      "start",
      "--dev",
      "--quiet",
      "--host",
      "127.0.0.1",
      "--port",
      String(ports.main),
      ...(ports.share === undefined
        ? []
        : ["--share-port", String(ports.share)]),
      "--config",
      CONFIG_PATH,
    ],
    { cwd: CWD, env, stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stdout?.on("data", (chunk: Buffer) => log.push(chunk.toString()));
  child.stderr?.on("data", (chunk: Buffer) => log.push(chunk.toString()));

  const healthy = async (port: number): Promise<boolean> => {
    try {
      return (await fetch(`http://127.0.0.1:${port}/health`)).ok;
    } catch {
      return false;
    }
  };
  const awaited = [
    ports.main,
    ...(ports.share === undefined ? [] : [ports.share]),
  ];
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`proxy exited early with code ${child.exitCode}`);
    }
    const states = await Promise.all(awaited.map(healthy));
    if (states.every(Boolean)) {
      return child;
    }
    await sleep(300);
  }
  child.kill("SIGKILL");
  throw new Error("the proxy never became healthy on every port");
}

async function startProxy(stubPort: number): Promise<void> {
  writeProxyConfig();
  const env = childEnv(stubPort);
  // The grant exists before the proxy starts, so the share listener is up the
  // moment the proxy is, rather than a supervisor poll later.
  const created = await cli(
    [
      "proxy",
      "share",
      "create",
      "--dev",
      "--peer",
      "suite-peer",
      "--preset",
      "open",
      "--json",
    ],
    env,
  );
  shareToken = (JSON.parse(created) as { token: string }).token;

  mainPort = await freePort();
  sharePort = await freePort();
  proxy = await launchProxy(
    env,
    { main: mainPort, share: sharePort },
    proxyLog,
  );
}

async function stopChild(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null) {
    return;
  }
  child.kill("SIGTERM");
  for (let i = 0; i < 40 && child.exitCode === null; i++) {
    await sleep(250);
  }
  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

async function stopProxy(): Promise<void> {
  const child = proxy;
  proxy = undefined;
  await stopChild(child);
}

// The runner calls process.exit, so a child must not outlive it.
process.on("exit", () => {
  proxy?.kill("SIGKILL");
  heldProxy?.kill("SIGKILL");
  rmSync(ROOT, { recursive: true, force: true });
});

async function startHeldOrigin(): Promise<{
  proxyUrl: string;
  certFile: string;
}> {
  const dir = join(ROOT, "held-tls");
  mkdirSync(dir, { recursive: true });
  const key = join(dir, "origin.key");
  const certFile = join(dir, "origin.crt");
  const config = join(dir, "origin.cnf");
  writeFileSync(
    config,
    [
      "[req]",
      "distinguished_name = dn",
      "x509_extensions = v3",
      "prompt = no",
      "[dn]",
      `CN = ${HELD_HOST}`,
      "[v3]",
      `subjectAltName = DNS:${HELD_HOST}`,
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  try {
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-days",
        "1",
        "-config",
        config,
        "-keyout",
        key,
        "-out",
        certFile,
      ],
      { stdio: "ignore" },
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Skip(
        "openssl is not installed, so the held TLS origin cannot be built",
      );
    }
    throw error;
  }
  const origin = createHttpsServer(
    { key: readFileSync(key), cert: readFileSync(certFile) },
    (req, res) => {
      const url = req.url ?? "";
      const served = SERVED[url];
      if (served !== undefined) {
        servedPaths.push(url);
        res.writeHead(200, {
          "content-type": served.type,
          "content-length": served.body.length,
          connection: "close",
        });
        res.end(served.body);
        return;
      }
      const held: HeldRequest = { url, closed: false };
      heldRequests.push(held);
      req.socket.once("close", () => {
        held.closed = true;
      });
    },
  );
  heldOrigin = origin;
  const tunnel = createHttpServer();
  tunnel.on("connect", (req, socket, head) => {
    heldConnects.push(req.url ?? "");
    socket.on("error", () => undefined);
    socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length > 0) {
      socket.unshift(head);
    }
    origin.emit("connection", socket);
  });
  heldTunnel = tunnel;
  const port = await listen(tunnel);
  return { proxyUrl: `http://127.0.0.1:${port}`, certFile };
}

/** The second proxy, whose https downloads go through the tunnel above. */
let tlsProxy: Promise<number> | undefined;
const ensureTlsProxy = (stubPort: number): Promise<number> =>
  (tlsProxy ??= (async () => {
    const { proxyUrl, certFile } = await startHeldOrigin();
    const port = await freePort();
    heldProxy = await launchProxy(
      childEnv(stubPort, HOME_HELD, {
        HTTPS_PROXY: proxyUrl,
        NODE_EXTRA_CA_CERTS: certFile,
      }),
      { main: port },
      heldLog,
    );
    return port;
  })());

// ----------------------------------------------------------------------- cases
type Reply = { status: number; text: string; contentType: string };

function buildRequest(
  door: Door,
  reference: string | undefined,
  stream: boolean,
  options: {
    port?: number;
    asBase64Source?: boolean;
    /** Claude base64 source only: the block's `media_type`. */
    mediaType?: string;
    /** Gemini only: the part's `mimeType`; `null` leaves the field out. */
    mimeType?: string | null;
    /**
     * The image part as the door's wire format spells it (an OpenAI `image_url`
     * part, a Claude `image` block, a Gemini `inlineData` part), sent next to
     * the text instead of one built from `reference`. `null` sends the text
     * alone: the same request with no image slot at all.
     */
    imagePart?: unknown;
  } = {},
): { url: string; body: unknown } {
  const base = `http://127.0.0.1:${options.port ?? mainPort}`;
  const text = "describe the image";
  const withImage = (textPart: unknown, part: unknown): unknown[] =>
    options.imagePart === null
      ? [textPart]
      : [textPart, options.imagePart ?? part];
  if (door === "openai") {
    return {
      url: `${base}/v1/chat/completions`,
      body: {
        model: MODEL.openai,
        ...(stream ? { stream: true } : {}),
        messages: [
          {
            role: "user",
            content:
              reference === undefined
                ? "hello"
                : withImage(
                    { type: "text", text },
                    { type: "image_url", image_url: { url: reference } },
                  ),
          },
        ],
      },
    };
  }
  if (door === "claude" || door === "claude-fallback") {
    const base64 = reference?.match(/^data:[^;]+;base64,(.+)$/)?.[1];
    const source =
      options.asBase64Source && base64
        ? {
            type: "base64",
            media_type: options.mediaType ?? "image/png",
            data: base64,
          }
        : { type: "url", url: reference };
    return {
      url: `${base}/v1/messages`,
      body: {
        model: MODEL[door],
        max_tokens: 64,
        ...(stream ? { stream: true } : {}),
        messages: [
          {
            role: "user",
            content:
              reference === undefined
                ? "hello"
                : withImage({ type: "text", text }, { type: "image", source }),
          },
        ],
      },
    };
  }
  const action = stream ? "streamGenerateContent" : "generateContent";
  const mimeType =
    options.mimeType === undefined ? "image/png" : options.mimeType;
  return {
    url: `${base}/v1beta/models/${MODEL.gemini}:${action}`,
    body: {
      contents: [
        {
          role: "user",
          parts:
            reference === undefined
              ? [{ text: "hello" }]
              : withImage(
                  { text },
                  {
                    inlineData: {
                      ...(mimeType === null ? {} : { mimeType }),
                      data: reference,
                    },
                  },
                ),
        },
      ],
    },
  };
}

async function send(
  door: Door,
  reference: string | undefined,
  stream: boolean,
  options: {
    port?: number;
    shareToken?: string;
    asBase64Source?: boolean;
    mediaType?: string;
    mimeType?: string | null;
    imagePart?: unknown;
  } = {},
): Promise<Reply> {
  const { url, body } = buildRequest(door, reference, stream, options);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(options.shareToken
        ? { "x-neurolink-share-token": options.shareToken }
        : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  return {
    status: response.status,
    text: await response.text(),
    contentType: response.headers.get("content-type") ?? "",
  };
}

/** Does `needle` appear in a body, raw or inside a base64 string within it? */
function bodyHolds(raw: string, needle: string): boolean {
  if (raw.includes(needle)) {
    return true;
  }
  const strings: string[] = [];
  const collect = (value: unknown): void => {
    if (typeof value === "string") {
      strings.push(value);
    } else if (Array.isArray(value)) {
      value.forEach(collect);
    } else if (value && typeof value === "object") {
      Object.values(value).forEach(collect);
    }
  };
  try {
    collect(JSON.parse(raw));
  } catch {
    return false;
  }
  return strings.some((candidate) => {
    const payload = candidate.match(/base64,(.+)$/s)?.[1] ?? candidate;
    return (
      payload.length >= 8 &&
      /^[A-Za-z0-9+/=\s]+$/.test(payload) &&
      Buffer.from(payload, "base64").toString("latin1").includes(needle)
    );
  });
}

const stubSaw = (needle: string, from = 0): boolean =>
  stubRequests.slice(from).some((r) => bodyHolds(r.raw, needle));

/** Every `data:image/...` string in the chat bodies the stub received. */
function stubImages(from: number): Array<{ mimeType: string; bytes: Buffer }> {
  const out: Array<{ mimeType: string; bytes: Buffer }> = [];
  for (const record of stubRequests.slice(from)) {
    for (const match of record.raw.matchAll(
      /data:(image\/[a-z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/g,
    )) {
      out.push({
        mimeType: match[1],
        bytes: Buffer.from(match[2], "base64"),
      });
    }
  }
  return out;
}

const stubImageBytes = (from: number): Buffer[] =>
  stubImages(from).map((image) => image.bytes);

const describeImages = (from: number): string =>
  JSON.stringify(
    stubImages(from).map((image) => [image.mimeType, image.bytes.length]),
  );

/** The refusal the door must answer, in its own error format. */
function assertRefusal(door: Door, reply: Reply, context: string): void {
  assertEqual(reply.status, 400, `${context}: refused with HTTP 400`);
  assert(
    reply.contentType.includes("application/json"),
    `${context}: refused as JSON before any stream started`,
  );
  const parsed = JSON.parse(reply.text) as {
    type?: string;
    error?: { type?: string; status?: string; code?: unknown };
  };
  if (door === "gemini") {
    assertEqual(
      parsed.error?.status,
      "INVALID_ARGUMENT",
      `${context}: Gemini shape`,
    );
    assertEqual(parsed.error?.code, 400, `${context}: Gemini code`);
  } else if (door.startsWith("claude")) {
    assertEqual(parsed.type, "error", `${context}: Anthropic envelope`);
    assertEqual(
      parsed.error?.type,
      "invalid_request_error",
      `${context}: Anthropic shape`,
    );
  } else {
    assertEqual(
      parsed.error?.type,
      "invalid_request_error",
      `${context}: OpenAI shape`,
    );
  }
  assert(
    !reply.text.includes(FILES) && !reply.text.includes(ROOT),
    `${context}: the answer must not echo a server path`,
  );
  for (const canary of [canaries.png, canaries.txt, canaries.noext]) {
    assert(
      !reply.text.includes(canary.token),
      `${context}: the answer must not carry file content`,
    );
  }
}

const modes = [
  { stream: false, label: "non-streaming" },
  { stream: true, label: "streaming" },
] as const;

/** Run `fn` and report what the stub and the URL listener saw during it. */
async function observed<T>(fn: () => Promise<T>): Promise<{
  result: T;
  stubFrom: number;
  chatPosts: number;
  connections: number;
  listenerRequests: number;
}> {
  const stubFrom = stubRequests.length;
  const chatBefore = chatPosts().length;
  const connectionsBefore = listener.connections;
  const requestsBefore = listener.requests.length;
  const result = await fn();
  // Anything the proxy dispatched after answering would land here.
  await sleep(250);
  return {
    result,
    stubFrom,
    chatPosts: chatPosts().length - chatBefore,
    connections: listener.connections - connectionsBefore,
    listenerRequests: listener.requests.length - requestsBefore,
  };
}

const stubPort = await listen(stub);
const listenerPort = await listen(listenerServer);
const dataUri = (extra: Buffer = Buffer.alloc(0)): string =>
  `data:image/png;base64,${Buffer.concat([PNG_BYTES, extra]).toString("base64")}`;

await runSuite(async () => {
  try {
    await startProxy(stubPort);

    // ------------------------------------------------------------- controls
    await test("control: the URL listener counts a connection it is given", async () => {
      const before = {
        connections: listener.connections,
        requests: listener.requests.length,
      };
      await new Promise<void>((done, fail) => {
        const socket = connect(listenerPort, "127.0.0.1", () => {
          socket.end();
          done();
        });
        socket.on("error", fail);
      });
      await sleep(100);
      await new Promise<void>((done, fail) => {
        fetch(`http://127.0.0.1:${listenerPort}/control.png`).then(
          (r) => r.arrayBuffer().then(() => done(), fail),
          fail,
        );
      });
      await sleep(100);
      assert(
        listener.connections - before.connections >= 2,
        "the listener must count a raw connection and an HTTP one",
      );
      assertEqual(
        listener.requests.length - before.requests,
        1,
        "the listener must record the HTTP request",
      );
    });

    for (const door of DOORS) {
      await test(`control: ${door} text-only request reaches the stub once, unchanged`, async () => {
        const seen = await observed(() => send(door, undefined, false));
        assertEqual(seen.result.status, 200, "text-only answered 200");
        assertEqual(seen.chatPosts, 1, "the stub received exactly one request");
        assert(
          seen.result.text.includes("stub-ok"),
          "the stub's answer came back",
        );
      });

      await test(`control: ${door} data: URI reaches the stub byte for byte`, async () => {
        const uri = dataUri(Buffer.from(canaries.dataUri.token));
        const seen = await observed(() =>
          send(door, uri, false, { asBase64Source: true }),
        );
        assertEqual(seen.result.status, 200, "a data: URI is still accepted");
        assertEqual(seen.chatPosts, 1, "the stub received exactly one request");
        assert(
          stubSaw(canaries.dataUri.token, seen.stubFrom),
          "the stub must receive the client's own bytes (canary detection works)",
        );
        const sent = Buffer.concat([
          PNG_BYTES,
          Buffer.from(canaries.dataUri.token),
        ]);
        assert(
          stubImageBytes(seen.stubFrom).some((bytes) => bytes.equals(sent)),
          "the image bytes must arrive unchanged",
        );
      });
    }

    // -------------------------------------------------- the security cases
    for (const door of DOORS) {
      for (const { stream, label } of modes) {
        await test(`${door} ${label}: a local path is refused and its bytes never reach the stub`, async () => {
          const answers: string[] = [];
          for (const [name, canary] of [
            ["image", canaries.png],
            ["text file", canaries.txt],
            ["extensionless file", canaries.noext],
          ] as const) {
            // Gemini's `data` is bytes, and a path made only of base64
            // characters reads as bytes: the Gemini cases below show it is not
            // read either.
            if (door === "gemini" && BYTES_ONLY.test(canary.file)) {
              continue;
            }
            const seen = await observed(() => send(door, canary.file, stream));
            assert(
              !stubSaw(canary.token, seen.stubFrom),
              `${name}: the file's bytes must never reach the stub`,
            );
            assertEqual(seen.chatPosts, 0, `${name}: nothing reached the stub`);
            assertRefusal(door, seen.result, `${door} ${label} ${name}`);
            answers.push(seen.result.text);
          }
          const missing = await observed(() => send(door, MISSING, stream));
          assertRefusal(door, missing.result, `${door} ${label} missing path`);
          assertEqual(missing.chatPosts, 0, "a missing path reached the stub");
          assertEqual(
            missing.result.text,
            answers[0],
            "a path that does not exist must get the same answer as one that does",
          );
        });

        await test(`${door} ${label}: http and loopback https URLs are refused without a connection`, async () => {
          for (const reference of [
            `http://127.0.0.1:${listenerPort}/x-${door}.png`,
            `http://localhost:${listenerPort}/x-${door}.png`,
            `https://127.0.0.1:${listenerPort}/x-${door}.png`,
            `https://localhost:${listenerPort}/x-${door}.png`,
            `HTTP://127.0.0.1:${listenerPort}/upper-${door}.png`,
            `file://${canaries.txt.file}`,
          ]) {
            const seen = await observed(() => send(door, reference, stream));
            assertEqual(
              seen.connections,
              0,
              "the listener must see zero connections",
            );
            assertEqual(
              seen.listenerRequests,
              0,
              "the listener must see zero requests",
            );
            assert(
              !stubSaw(canaries.txt.token, seen.stubFrom),
              "a file: URL must not read the file",
            );
            assertEqual(seen.chatPosts, 0, "nothing reached the stub");
            assertRefusal(
              door,
              seen.result,
              `${door} ${label} ${reference.split(":")[0]}`,
            );
          }
        });

        await test(`${door} ${label}: a data: URI and a text-only request still reach the stub`, async () => {
          const withImage = await observed(() =>
            send(door, dataUri(), stream, { asBase64Source: true }),
          );
          assertEqual(withImage.result.status, 200, "data: URI answered 200");
          assertEqual(
            withImage.chatPosts,
            1,
            "data: URI reached the stub once",
          );
          assert(
            stubImageBytes(withImage.stubFrom).some((bytes) =>
              bytes.equals(PNG_BYTES),
            ),
            "the image arrived unchanged",
          );
          const textOnly = await observed(() => send(door, undefined, stream));
          assertEqual(textOnly.result.status, 200, "text-only answered 200");
          assertEqual(textOnly.chatPosts, 1, "text-only reached the stub once");
        });
      }
    }

    // ------------------------------------------------------ Gemini raw base64
    // Google's `inlineData.data` is raw base64 with the type in `mimeType`. The
    // vetter takes only `data:` URIs and https URLs, so the Gemini parser wraps
    // base64 of an `image/*` type into a `data:` URI and leaves everything else
    // for the vetter to judge as it always did.
    const geminiBytes = Buffer.concat([
      PNG_BYTES,
      Buffer.from(canaries.rawBase64.token),
    ]);
    // Three bytes that encode to `+` and `-` (`/` and `_`) in the two alphabets,
    // aligned so that they do.
    const geminiUrlSafeBytes = Buffer.concat([
      geminiBytes,
      Buffer.alloc((3 - (geminiBytes.length % 3)) % 3),
      Buffer.from([0xfb, 0xef, 0xbe, 0xfb, 0xef, 0xbe]),
    ]);
    const geminiStandard = geminiUrlSafeBytes.toString("base64");
    const geminiUrlSafe = geminiUrlSafeBytes.toString("base64url");

    await test("control: the URL-safe payload really differs from the standard one", () => {
      assert(
        geminiStandard.includes("+") && !geminiStandard.includes("-"),
        "the standard payload carries +",
      );
      assert(
        geminiUrlSafe.includes("-") && !/[+/]/.test(geminiUrlSafe),
        "the URL-safe payload carries - and no + or /",
      );
    });

    for (const { stream, label } of modes) {
      await test(`gemini ${label}: raw base64 inlineData of an image type reaches the stub as the client's bytes`, async () => {
        for (const [name, payload, bytes, mimeType] of [
          ["standard base64", geminiStandard, geminiUrlSafeBytes, "image/png"],
          ["URL-safe base64", geminiUrlSafe, geminiUrlSafeBytes, "image/png"],
          [
            "unpadded URL-safe base64",
            geminiBytes.toString("base64url"),
            geminiBytes,
            "image/png",
          ],
          [
            "upper-case type",
            geminiBytes.toString("base64"),
            geminiBytes,
            "IMAGE/PNG",
          ],
        ] as const) {
          const seen = await observed(() =>
            send("gemini", payload, stream, { mimeType }),
          );
          assertEqual(seen.result.status, 200, `${name}: answered 200`);
          assertEqual(seen.chatPosts, 1, `${name}: reached the stub once`);
          assert(
            stubSaw(canaries.rawBase64.token, seen.stubFrom),
            `${name}: the stub must receive the client's own bytes`,
          );
          assert(
            stubImageBytes(seen.stubFrom).some((got) => got.equals(bytes)),
            `${name}: the image bytes must arrive unchanged as standard base64 in a data: URI`,
          );
        }
      });

      await test(`gemini ${label}: raw base64 not declared as an image is still refused`, async () => {
        const payload = geminiBytes.toString("base64");
        for (const [name, mimeType] of [
          ["audio", "audio/wav"],
          ["pdf", "application/pdf"],
          ["no type", null],
        ] as const) {
          const seen = await observed(() =>
            send("gemini", payload, stream, { mimeType }),
          );
          assertEqual(seen.chatPosts, 0, `${name}: nothing reached the stub`);
          assertRefusal("gemini", seen.result, `gemini ${label} ${name}`);
          assert(
            seen.result.text.includes("invalid_image_reference"),
            `${name}: refused as invalid_image_reference`,
          );
        }
      });

      await test(`gemini ${label}: raw base64 of an impossible length or with inconsistent padding is refused locally`, async () => {
        // One image per remainder of the byte length mod 3, so the padded form
        // needs 0, 2 or 1 `=`. The well-formed forms of each must reach the stub
        // (the positive precondition) while malformed siblings of the same
        // bytes, canary included, must not.
        for (const remainder of [0, 1, 2]) {
          const bytes = Buffer.concat([
            geminiBytes,
            Buffer.alloc((remainder - (geminiBytes.length % 3) + 3) % 3),
          ]);
          assertEqual(
            bytes.length % 3,
            remainder,
            "precondition: the byte length has the intended remainder",
          );
          const padded = bytes.toString("base64");
          const body = padded.replace(/=+$/, "");
          const missing = padded.length - body.length;
          // Characters appended until the length is one over a multiple of four,
          // which no base64 text has.
          const overBody = `${body}${"A".repeat((5 - (body.length % 4)) % 4)}`;
          const urlSafe = bytes.toString("base64url");
          const overUrlSafe = `${urlSafe}${"A".repeat((5 - (urlSafe.length % 4)) % 4)}`;
          assertEqual(
            overBody.length % 4,
            1,
            "precondition: the over-long payload leaves one character",
          );
          assert(
            overUrlSafe.length % 4 === 1 && overUrlSafe.includes("-"),
            "precondition: the URL-safe over-long payload uses the URL-safe alphabet",
          );

          const wellFormed: Array<readonly [string, string]> = [
            ["padded", padded],
            ["unpadded", body],
            ["URL-safe", urlSafe],
          ];
          for (const [name, payload] of wellFormed) {
            const context = `remainder ${remainder} ${name}`;
            const seen = await observed(() => send("gemini", payload, stream));
            assertEqual(seen.result.status, 200, `${context}: answered 200`);
            assertEqual(seen.chatPosts, 1, `${context}: reached the stub once`);
            assert(
              stubImageBytes(seen.stubFrom).some((got) => got.equals(bytes)),
              `${context}: the image bytes must arrive unchanged`,
            );
          }

          const malformed: Array<readonly [string, string]> = [
            ["one character over", overBody],
            ["one character over, URL-safe", overUrlSafe],
            ["one character over, with `=`", `${overBody}=`],
            // `=` present, but not the count the length requires.
            ...[1, 2, 3]
              .filter((count) => count !== missing)
              .map(
                (count) =>
                  [
                    `${count} \`=\` where ${missing} belong`,
                    `${body}${"=".repeat(count)}`,
                  ] as const,
              ),
            // `=` anywhere but the end.
            [
              "`=` inside the payload",
              `${body.slice(0, 8)}=${body.slice(8)}${"=".repeat(missing)}`,
            ],
          ];
          for (const [name, payload] of malformed) {
            const context = `remainder ${remainder} ${name}`;
            const seen = await observed(() => send("gemini", payload, stream));
            assertEqual(
              seen.chatPosts,
              0,
              `${context}: nothing reached the stub`,
            );
            assertRefusal("gemini", seen.result, `gemini ${label} ${context}`);
            assert(
              seen.result.text.includes("invalid_image_reference"),
              `${context}: refused as invalid_image_reference`,
            );
            assert(
              !seen.result.text.includes(payload.slice(0, 32)),
              `${context}: the answer must not echo the data`,
            );
          }
        }
      });

      await test(`gemini ${label}: an image type that is not an image/<subtype> token is refused without being echoed`, async () => {
        const marker = token();
        const payload = geminiBytes.toString("base64");
        for (const mimeType of [
          "image/png, text/html",
          `image/png;charset=${marker}`,
          "image/ png",
          `image/png\nX-${marker}: 1`,
          "image/",
          `image/${"a".repeat(200)}`,
          `image/png;base64,${marker}`,
        ]) {
          const seen = await observed(() =>
            send("gemini", payload, stream, { mimeType }),
          );
          const name = JSON.stringify(mimeType.slice(0, 24));
          assertEqual(seen.chatPosts, 0, `${name}: nothing reached the stub`);
          assertRefusal("gemini", seen.result, `gemini ${label} ${name}`);
          assert(
            seen.result.text.includes("invalid_image_reference"),
            `${name}: refused as invalid_image_reference`,
          );
          assert(
            !seen.result.text.includes(marker) &&
              !seen.result.text.includes("text/html") &&
              !seen.result.text.includes(payload.slice(0, 32)),
            `${name}: the answer must not echo the type or the data`,
          );
        }
      });

      await test(`gemini ${label}: a path in inlineData.data is never read`, async () => {
        const cases = [
          ["image path", canaries.png, canaries.png.file, "image/png"],
          ["text file", canaries.txt, canaries.txt.file, "image/png"],
          [
            "extensionless file",
            canaries.noext,
            canaries.noext.file,
            "image/png",
          ],
          [
            "relative path",
            canaries.relative,
            canaries.relative.file,
            "image/png",
          ],
          ["missing path", canaries.png, MISSING, "image/png"],
          [
            "relative path one character over a multiple of four",
            canaries.relative,
            `${canaries.relative.file}xxx`,
            "image/png",
          ],
          [
            "path declared as pdf",
            canaries.relative,
            canaries.relative.file,
            "application/pdf",
          ],
          [
            "path with no type",
            canaries.relative,
            canaries.relative.file,
            null,
          ],
          [
            "absolute path made only of base64 characters",
            canaries.nonImage,
            "/var/tmp/photo",
            "image/png",
          ],
        ] as const;
        assert(
          takenForBytes(canaries.relative.file) &&
            BYTES_ONLY.test(`${canaries.relative.file}xxx`) &&
            !takenForBytes(`${canaries.relative.file}xxx`),
          "precondition: the relative canary reads as base64 of a decodable length, and one more character does not",
        );
        for (const [name, canary, reference, mimeType] of cases) {
          const seen = await observed(() =>
            send("gemini", reference, stream, { mimeType }),
          );
          assert(
            !stubSaw(canary.token, seen.stubFrom),
            `${name}: the file's bytes must never reach the stub`,
          );
          if (mimeType === "image/png" && takenForBytes(reference)) {
            // Base64 characters only: the client sent bytes, whatever else they
            // spell. They are wrapped and decoded as such, the file is not
            // opened, and the decoded text is no image, so it is refused as data.
            assertEqual(seen.chatPosts, 0, `${name}: nothing reached the stub`);
            assertRefusal("gemini", seen.result, `gemini ${label} ${name}`);
            assert(
              seen.result.text.includes("invalid_image_data"),
              `${name}: refused as invalid_image_data`,
            );
            assert(
              !seen.result.text.includes(reference),
              `${name}: the answer must not echo the data`,
            );
          } else {
            assertEqual(seen.chatPosts, 0, `${name}: nothing reached the stub`);
            assertRefusal("gemini", seen.result, `gemini ${label} ${name}`);
          }
        }
      });
    }

    // The stub speaks the OpenAI wire, and the SDK stops an OpenAI request at 10
    // images, so ten is as many as can be served here: the proxy's own limit of
    // 20 is shown by refusing 21.
    await test("gemini: several raw-base64 images arrive, and converted images count against the 20-image limit", async () => {
      const post = async (count: number): Promise<Reply> => {
        const response = await fetch(
          `http://127.0.0.1:${mainPort}/v1beta/models/${MODEL.gemini}:generateContent`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: "describe" },
                    ...Array.from({ length: count }, (_, index) => ({
                      inlineData: {
                        mimeType: "image/png",
                        data: Buffer.concat([
                          PNG_BYTES,
                          Buffer.from([index]),
                        ]).toString("base64"),
                      },
                    })),
                  ],
                },
              ],
            }),
          },
        );
        return {
          status: response.status,
          text: await response.text(),
          contentType: response.headers.get("content-type") ?? "",
        };
      };
      const several = await observed(() => post(10));
      assertEqual(
        several.result.status,
        200,
        "10 raw-base64 images are served",
      );
      assertEqual(several.chatPosts, 1, "they reached the stub once");
      assertEqual(
        stubImageBytes(several.stubFrom).length,
        10,
        "all 10 images arrived",
      );
      const over = await observed(() => post(21));
      assertEqual(over.chatPosts, 0, "21 images never reached the stub");
      assertRefusal("gemini", over.result, "21 raw-base64 images");
      assert(
        over.result.text.includes("image_input_too_large"),
        "refused with the size/count code",
      );
    });

    // -------------------------------------------------- inline image bytes
    // An inline image is judged by its bytes. Each door has its own way to say
    // "these base64 bytes are an image of this type": a data: URI (OpenAI), a
    // base64 source with a media_type (Claude), raw base64 next to a mimeType
    // (Gemini). `sendInline` speaks all three.
    const inlineRequest = (
      door: Door,
      payload: string,
      declared: string,
    ): { reference: string; options: Parameters<typeof send>[3] } => {
      if (door === "gemini") {
        return { reference: payload, options: { mimeType: declared } };
      }
      const reference = `data:${declared};base64,${payload}`;
      return door === "openai"
        ? { reference, options: {} }
        : { reference, options: { asBase64Source: true, mediaType: declared } };
    };
    const sendInline = (
      door: Door,
      payload: string,
      declared: string,
      stream: boolean,
      extra: Parameters<typeof send>[3] = {},
    ): Promise<Reply> => {
      const { reference, options } = inlineRequest(door, payload, declared);
      return send(door, reference, stream, { ...options, ...extra });
    };

    /** The stub must hold exactly `bytes`, labelled `type`. */
    const assertArrived = (
      from: number,
      bytes: Buffer,
      type: string,
      context: string,
    ): void => {
      assert(
        stubImages(from).some(
          (image) => image.mimeType === type && image.bytes.equals(bytes),
        ),
        `${context}: the stub must receive these exact bytes as ${type}, got ${describeImages(from)}`,
      );
    };

    /** A refusal as data, before any stream, with nothing echoed. */
    const assertRefusedAsData = (
      door: Door,
      reply: Reply,
      context: string,
      echoes: readonly string[],
    ): void => {
      assertRefusal(door, reply, context);
      assert(
        reply.text.includes("invalid_image_data"),
        `${context}: refused as invalid_image_data, got ${reply.text.slice(0, 160)}`,
      );
      for (const echo of echoes) {
        assert(
          echo.length > 0 && !reply.text.includes(echo),
          `${context}: the answer must not echo the data`,
        );
      }
    };

    const FORMATS = [
      { name: "PNG", type: "image/png", bytes: PNG_BYTES },
      { name: "JPEG", type: "image/jpeg", bytes: JPEG_BYTES },
      { name: "WebP", type: "image/webp", bytes: WEBP_BYTES },
      { name: "GIF", type: "image/gif", bytes: GIF_BYTES },
    ] as const;

    await test("control: the real images are images, and the sample non-images are not", () => {
      assertEqual(
        PNG_BYTES.subarray(0, 4).toString("latin1"),
        "\x89PNG",
        "PNG",
      );
      assertEqual(JPEG_BYTES.subarray(0, 3).toString("hex"), "ffd8ff", "JPEG");
      assertEqual(
        WEBP_BYTES.subarray(8, 12).toString("latin1"),
        "WEBP",
        "WebP",
      );
      assertEqual(GIF_BYTES.subarray(0, 6).toString("latin1"), "GIF89a", "GIF");
      for (const { name, bytes } of CONVERTIBLE_IMAGES) {
        assert(bytes.length >= 22, `${name}: a fixture long enough to be one`);
      }
    });

    for (const door of DOORS) {
      for (const { stream, label } of modes) {
        await test(`${door} ${label}: PNG, JPEG, WebP and GIF reach the stub byte for byte under their own type`, async () => {
          for (const { name, type, bytes } of FORMATS) {
            const seen = await observed(() =>
              sendInline(door, bytes.toString("base64"), type, stream),
            );
            assertEqual(seen.result.status, 200, `${name}: answered 200`);
            assertEqual(seen.chatPosts, 1, `${name}: reached the stub once`);
            assertArrived(seen.stubFrom, bytes, type, name);
          }
        });

        await test(`${door} ${label}: bytes declared as the wrong type reach the stub under the type they have`, async () => {
          const cases: Array<readonly [string, Buffer, string, string]> = [
            ["JPEG declared image/png", JPEG_BYTES, "image/png", "image/jpeg"],
            ["PNG declared image/jpeg", PNG_BYTES, "image/jpeg", "image/png"],
            ["WebP declared image/gif", WEBP_BYTES, "image/gif", "image/webp"],
            ["GIF declared image/jpg", GIF_BYTES, "image/jpg", "image/gif"],
            ["PNG declared in upper case", PNG_BYTES, "IMAGE/PNG", "image/png"],
            // Gemini only wraps a value that carries an image type; the other
            // two doors take any declared type and judge the bytes.
            ...(door === "gemini"
              ? []
              : ([
                  [
                    "PNG declared application/octet-stream",
                    PNG_BYTES,
                    "application/octet-stream",
                    "image/png",
                  ],
                  [
                    "JPEG declared text/plain",
                    JPEG_BYTES,
                    "text/plain",
                    "image/jpeg",
                  ],
                ] as const)),
          ];
          for (const [name, bytes, declared, expected] of cases) {
            const seen = await observed(() =>
              sendInline(door, bytes.toString("base64"), declared, stream),
            );
            assertEqual(seen.result.status, 200, `${name}: answered 200`);
            assertEqual(seen.chatPosts, 1, `${name}: reached the stub once`);
            assertArrived(seen.stubFrom, bytes, expected, name);
            if (declared.toLowerCase() !== expected) {
              assert(
                !stubImages(seen.stubFrom).some(
                  (image) => image.mimeType === declared.toLowerCase(),
                ),
                `${name}: the declared type must not reach the stub`,
              );
            }
          }
        });

        await test(`${door} ${label}: HEIC, HEIF, AVIF, BMP, TIFF, ICO and JPEG 2000 are accepted, not refused`, async () => {
          for (const { name, type, bytes } of CONVERTIBLE_IMAGES) {
            const seen = await observed(() =>
              sendInline(door, bytes.toString("base64"), type, stream),
            );
            assertEqual(seen.result.status, 200, `${name}: answered 200`);
            assertEqual(seen.chatPosts, 1, `${name}: reached the stub once`);
            // The SDK converts these to PNG when a decoder can read them and
            // sends the original bytes when it cannot: either is the SDK doing
            // its job, and neither is the proxy refusing a format.
            const images = stubImages(seen.stubFrom);
            assert(
              images.some(
                (image) =>
                  (image.mimeType === type && image.bytes.equals(bytes)) ||
                  (image.mimeType === "image/png" &&
                    image.bytes.subarray(0, 8).equals(PNG_MAGIC)),
              ),
              `${name}: the stub must receive the original bytes as ${type} or a PNG made from them, got ${describeImages(seen.stubFrom)}`,
            );
          }
        });

        await test(`${door} ${label}: bytes that are not a recognised image are refused as invalid_image_data and never reach the stub`, async () => {
          const notImages: Array<readonly [string, Buffer]> = [
            ["text", Buffer.from(`not an image ${canaries.nonImage.token}`)],
            ["a path", Buffer.from(canaries.png.file)],
            [
              "an unreadable relative path",
              Buffer.from(canaries.relative.file),
            ],
            ["HTML", Buffer.from(`<html>${canaries.nonImage.token}</html>`)],
            ["PDF", Buffer.from(`%PDF-1.7\n${canaries.nonImage.token}\n%%EOF`)],
            [
              "SVG",
              Buffer.from(
                `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><!-- ${canaries.nonImage.token} --></svg>`,
              ),
            ],
            ["ZIP", Buffer.concat([Buffer.from("PK\x03\x04"), filler(64)])],
            ["MP4 (ISO-BMFF that is not an image)", ftypBox("mp42", ["isom"])],
            [
              "text beginning BM",
              Buffer.from("BM is not a bitmap, it is a sentence"),
            ],
            ["NUL bytes", Buffer.alloc(64)],
            ["letters GIF without a version", Buffer.from("GIF\0\0\0\0\0\0")],
            ["PNG signature cut to 4 bytes", PNG_BYTES.subarray(0, 4)],
            ["PNG signature cut to 7 bytes", PNG_BYTES.subarray(0, 7)],
            ["JPEG cut to 2 bytes", JPEG_BYTES.subarray(0, 2)],
            ["GIF header cut to 5 bytes", GIF_BYTES.subarray(0, 5)],
            ["WebP cut to 11 bytes", WEBP_BYTES.subarray(0, 11)],
            ["one byte", Buffer.from([0x89])],
          ];
          const chatBefore = chatPosts().length;
          const stubFrom = stubRequests.length;
          for (const [name, bytes] of notImages) {
            const payload = bytes.toString("base64");
            const reply = await sendInline(door, payload, "image/png", stream);
            assertRefusedAsData(door, reply, `${door} ${label} ${name}`, [
              payload,
              canaries.nonImage.token,
            ]);
          }
          // Anything dispatched after an answer would land here.
          await sleep(250);
          assertEqual(
            chatPosts().length - chatBefore,
            0,
            "no refused image reached the stub",
          );
          assert(
            !stubSaw(canaries.nonImage.token, stubFrom),
            "no refused image's bytes reached the stub",
          );
        });
      }
    }

    await test("control: the stub receives the canary of an image the proxy was handed legitimately", async () => {
      const bytes = Buffer.concat([
        PNG_BYTES,
        Buffer.from(canaries.nonImage.token),
      ]);
      const seen = await observed(() =>
        sendInline("openai", bytes.toString("base64"), "image/png", false),
      );
      assertEqual(
        seen.result.status,
        200,
        "an image carrying the canary is served",
      );
      assert(
        stubSaw(canaries.nonImage.token, seen.stubFrom),
        "canary detection works, so its absence above means something",
      );
    });

    await test("a data: URI of the wrong shape is refused as invalid_image_data, on every door", async () => {
      const png = PNG_BYTES.toString("base64");
      const shapes: Array<readonly [string, string]> = [
        ["not base64 (percent-encoded)", "data:image/png,%89PNG%0D%0A%1A%0A"],
        ["no comma", "data:image/png;base64"],
        ["no payload", "data:image/png;base64,"],
        ["no payload, no type", "data:;base64,"],
        ["characters outside the alphabet", "data:image/png;base64,@@@@@@@@"],
        [
          "a space in the payload",
          `data:image/png;base64,${png.slice(0, 8)} ${png.slice(8)}`,
        ],
        [
          "a newline in the payload",
          `data:image/png;base64,${png.slice(0, 8)}\n${png.slice(8)}`,
        ],
        [
          "one character over a multiple of four",
          "data:image/png;base64,iVBOR",
        ],
        [
          "`=` inside the payload",
          `data:image/png;base64,${png.slice(0, 8)}=${png.slice(8)}`,
        ],
        [
          "`=` where none belongs",
          `data:image/png;base64,${png.replace(/=+$/, "")}====`,
        ],
        ["a comma before ;base64", `data:image/png,x;base64,${png}`],
      ];
      for (const door of DOORS) {
        for (const stream of [false, true]) {
          const chatBefore = chatPosts().length;
          for (const [name, uri] of shapes) {
            const reply = await send(door, uri, stream);
            assertRefusedAsData(
              door,
              reply,
              `${door} ${name}`,
              [uri.slice(uri.indexOf(",") + 1)].filter(
                (echo) => echo.length > 7,
              ),
            );
          }
          await sleep(250);
          assertEqual(
            chatPosts().length - chatBefore,
            0,
            `${door}: no malformed data: URI reached the stub`,
          );
        }
      }
    });

    await test("a data: URI in the URL-safe or unpadded alphabet, or with header parameters, reaches the stub as standard padded base64", async () => {
      for (const [name, uri] of [
        [
          "URL-safe",
          `data:image/png;base64,${geminiUrlSafeBytes.toString("base64url")}`,
        ],
        [
          "unpadded",
          `data:image/png;base64,${geminiBytes.toString("base64").replace(/=+$/, "")}`,
        ],
        [
          "header parameters",
          `data:image/png;charset=utf-8;name=a.png;base64,${geminiBytes.toString("base64")}`,
        ],
        ["no declared type", `data:;base64,${geminiBytes.toString("base64")}`],
      ] as const) {
        const bytes = name === "URL-safe" ? geminiUrlSafeBytes : geminiBytes;
        for (const door of ["openai", "claude"] as const) {
          const seen = await observed(() => send(door, uri, false));
          assertEqual(seen.result.status, 200, `${door} ${name}: answered 200`);
          assertEqual(
            seen.chatPosts,
            1,
            `${door} ${name}: reached the stub once`,
          );
          assertArrived(seen.stubFrom, bytes, "image/png", `${door} ${name}`);
          assert(
            stubSaw(canaries.rawBase64.token, seen.stubFrom),
            `${door} ${name}: the client's own bytes arrived`,
          );
        }
      }
    });

    // ----------------------------------------------------- empty image slots
    // An image slot that carries nothing is still an image slot. Skipping it
    // while translating would send the rest of the request upstream as though
    // the client had attached no picture, and the refusal the proxy documents
    // would never be answered. Each door spells "an image with no bytes" in its
    // own way, and each must reach the vetter:
    //   - an empty inline payload is `invalid_image_data` (the same answer the
    //     OpenAI door already gives to `data:image/png;base64,`);
    //   - an empty URL is `invalid_image_reference`, on the OpenAI and Claude
    //     doors alike (Gemini has no URL form here).
    type EmptySlot = {
      name: string;
      part: unknown;
      code: "invalid_image_data" | "invalid_image_reference";
    };
    const emptySlots = (door: Door): readonly EmptySlot[] => {
      if (door === "openai") {
        return [
          {
            name: 'an image_url with url ""',
            part: { type: "image_url", image_url: { url: "" } },
            code: "invalid_image_reference",
          },
          {
            name: "an image_url with no url",
            part: { type: "image_url", image_url: {} },
            code: "invalid_image_reference",
          },
          {
            name: "an image_url data: URI with no payload",
            part: {
              type: "image_url",
              image_url: { url: "data:image/png;base64," },
            },
            code: "invalid_image_data",
          },
        ];
      }
      if (door === "gemini") {
        return [
          {
            name: 'an image/png inlineData with data ""',
            part: { inlineData: { mimeType: "image/png", data: "" } },
            code: "invalid_image_data",
          },
          {
            name: "an image/jpeg inlineData with no data",
            part: { inlineData: { mimeType: "image/jpeg" } },
            code: "invalid_image_data",
          },
          {
            name: "an image/png inlineData with data null",
            part: { inlineData: { mimeType: "image/png", data: null } },
            code: "invalid_image_data",
          },
          {
            name: "an image/png inlineData with data a number",
            part: { inlineData: { mimeType: "image/png", data: 12345 } },
            code: "invalid_image_data",
          },
        ];
      }
      return [
        {
          name: 'a base64 source with data ""',
          part: {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: "" },
          },
          code: "invalid_image_data",
        },
        {
          name: "a base64 source with no data",
          part: {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg" },
          },
          code: "invalid_image_data",
        },
        {
          name: "a base64 source with neither media_type nor data",
          part: { type: "image", source: { type: "base64" } },
          code: "invalid_image_data",
        },
        {
          name: 'a url source with url ""',
          part: { type: "image", source: { type: "url", url: "" } },
          code: "invalid_image_reference",
        },
        {
          name: "a url source with no url",
          part: { type: "image", source: { type: "url" } },
          code: "invalid_image_reference",
        },
      ];
    };

    for (const door of DOORS) {
      for (const { stream, label } of modes) {
        await test(`${door} ${label}: an empty image slot is refused, not skipped, and the request never reaches the stub`, async () => {
          // Preconditions: the same request without the empty image, and with a
          // real one, are served. Without them a refusal could be the request
          // being unservable rather than the empty image being vetted.
          const without = await observed(() =>
            send(door, "", stream, { imagePart: null }),
          );
          assertEqual(
            without.result.status,
            200,
            "the request without the empty image is served",
          );
          assertEqual(
            without.chatPosts,
            1,
            "the request without the empty image reaches the stub once",
          );
          assertEqual(
            stubImages(without.stubFrom).length,
            0,
            "the request without the empty image carries no image upstream",
          );
          const real = await observed(() =>
            sendInline(door, PNG_BYTES.toString("base64"), "image/png", stream),
          );
          assertEqual(real.result.status, 200, "a real image is served");
          assertEqual(real.chatPosts, 1, "a real image reaches the stub once");

          // Every slot is judged, so one that is skipped does not hide another.
          const chatBefore = chatPosts().length;
          const unrefused: string[] = [];
          for (const { name, part, code } of emptySlots(door)) {
            const reply = await send(door, "", stream, { imagePart: part });
            try {
              assertRefusal(door, reply, name);
              assert(
                reply.text.includes(code),
                `${name}: refused as ${code}, got ${reply.text.slice(0, 160)}`,
              );
            } catch (error) {
              unrefused.push(
                error instanceof Error ? error.message : String(error),
              );
            }
          }
          assertEqual(
            unrefused.length,
            0,
            `${door} ${label}: every empty image slot is refused, but: ${unrefused.join("; ")}`,
          );
          // Anything dispatched after an answer would land here.
          await sleep(250);
          assertEqual(
            chatPosts().length - chatBefore,
            0,
            `${door} ${label}: no empty image slot reached the stub`,
          );
        });
      }
    }

    // What is not an image slot is left as it always was: a Gemini part without
    // an inlineData, or with one that declares no image type, and a Claude
    // block whose source is neither a base64 payload nor a URL, carry nothing
    // to refuse, and the request goes on without them.
    for (const door of ["gemini", "claude", "claude-fallback"] as const) {
      const parts: Array<readonly [string, unknown]> =
        door === "gemini"
          ? [
              ["a part with no inlineData", {}],
              ["an inlineData with no type and no data", { inlineData: {} }],
              [
                "an empty inlineData with no image type",
                { inlineData: { data: "" } },
              ],
              [
                "an empty audio inlineData",
                { inlineData: { mimeType: "audio/wav", data: "" } },
              ],
            ]
          : [
              [
                "an image block whose source is neither base64 nor a url",
                {
                  type: "image",
                  source: { type: "file", file_id: "file_unused" },
                },
              ],
            ];
      for (const { stream, label } of modes) {
        await test(`${door} ${label}: a part that is not an image slot is still left out, and the request is served`, async () => {
          for (const [name, part] of parts) {
            const seen = await observed(() =>
              send(door, "", stream, { imagePart: part }),
            );
            assertEqual(seen.result.status, 200, `${name}: answered 200`);
            assertEqual(seen.chatPosts, 1, `${name}: reached the stub once`);
            assertEqual(
              stubImages(seen.stubFrom).length,
              0,
              `${name}: no image went upstream`,
            );
          }
        });
      }
    }

    // ------------------------------------------------------------- bounds
    await test("a request with more images than the proxy accepts is refused whole", async () => {
      const images = Array.from({ length: 21 }, () => dataUri());
      const chatBefore = chatPosts().length;
      const response = await fetch(
        `http://127.0.0.1:${mainPort}/v1/chat/completions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model: MODEL.openai,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: "describe" },
                  ...images.map((url) => ({
                    type: "image_url",
                    image_url: { url },
                  })),
                ],
              },
            ],
          }),
        },
      );
      const text = await response.text();
      assertEqual(
        chatPosts().length - chatBefore,
        0,
        "nothing reached the stub",
      );
      assertEqual(response.status, 400, "refused with HTTP 400");
      assert(
        text.includes("image_input_too_large"),
        "refused with the size/count code",
      );
    });

    await test("a path named only in the prompt text is not read", async () => {
      const seen = await observed(async () => {
        const response = await fetch(
          `http://127.0.0.1:${mainPort}/v1/chat/completions`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              model: MODEL.openai,
              messages: [
                { role: "user", content: `summarise ${canaries.prompt.file}` },
              ],
            }),
          },
        );
        await response.text();
        return response.status;
      });
      assertEqual(seen.result, 200, "the text-only request is answered");
      assert(
        !stubSaw(canaries.prompt.token, seen.stubFrom),
        "a path in the prompt must not be opened",
      );
    });

    // ----------------------------------------------------------- share port
    // The share port admits any holder of a share token and serves the same
    // routes as the main port, so the guard must hold there too.
    await test("share port: untokened requests are still gated (precondition)", async () => {
      const response = await fetch(
        `http://127.0.0.1:${sharePort}/v1/chat/completions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model: MODEL.openai,
            messages: [{ role: "user", content: "hello" }],
          }),
        },
      );
      await response.text();
      assertEqual(
        response.status,
        401,
        "the share port refuses a request with no token",
      );
      assertEqual(
        response.headers.get("x-neurolink-grant-reason"),
        "missing_token",
        "refused by the share gate",
      );
    });

    for (const door of DOORS) {
      await test(`share port ${door}: a tokened text-only and data: request reach the stub (precondition)`, async () => {
        const textOnly = await observed(() =>
          send(door, undefined, false, { port: sharePort, shareToken }),
        );
        assertEqual(
          textOnly.result.status,
          200,
          "a tokened text-only request is served",
        );
        assertEqual(textOnly.chatPosts, 1, "it reached the stub");
        const withImage = await observed(() =>
          send(door, dataUri(), false, {
            port: sharePort,
            shareToken,
            asBase64Source: true,
          }),
        );
        assertEqual(
          withImage.result.status,
          200,
          "a tokened data: request is served",
        );
        assertEqual(withImage.chatPosts, 1, "it reached the stub");
      });

      await test(`share port ${door}: a tokened local path or loopback URL is refused`, async () => {
        const path = await observed(() =>
          send(door, canaries.txt.file, false, { port: sharePort, shareToken }),
        );
        assert(
          !stubSaw(canaries.txt.token, path.stubFrom),
          "the file's bytes must never reach the stub",
        );
        assertEqual(path.chatPosts, 0, "nothing reached the stub");
        assertRefusal(door, path.result, `share ${door} path`);
        const url = await observed(() =>
          send(
            door,
            `http://127.0.0.1:${listenerPort}/share-${door}.png`,
            false,
            { port: sharePort, shareToken },
          ),
        );
        assertEqual(
          url.connections,
          0,
          "the listener must see zero connections",
        );
        assertRefusal(door, url.result, `share ${door} url`);
      });
    }

    // --------------------------------------------------- downloaded bytes
    // A download is judged by its bytes too: the origin answers `200` for a
    // page, for text it calls `image/png` and for nothing at all, and none of
    // those may be sent on as a picture. Each case first proves that the origin
    // served the path, so a refusal is about what was served.
    for (const door of DOORS) {
      for (const { stream, label } of modes) {
        await test(`${door} ${label}: a downloaded image reaches the stub byte for byte, under the type its bytes have`, async () => {
          const heldMain = await ensureTlsProxy(stubPort);
          for (const [path, bytes, type] of [
            ["/ok.png", PNG_BYTES, "image/png"],
            ["/photo.jpg", JPEG_BYTES, "image/jpeg"],
            // The origin says image/png; the bytes are a JPEG.
            ["/mislabelled.png", JPEG_BYTES, "image/jpeg"],
          ] as const) {
            const servedBefore = servedPaths.length;
            const seen = await observed(() =>
              send(door, `https://${HELD_HOST}${path}`, stream, {
                port: heldMain,
              }),
            );
            assert(
              servedPaths.slice(servedBefore).includes(path),
              `${path}: the origin served the download`,
            );
            assertEqual(seen.result.status, 200, `${path}: answered 200`);
            assertEqual(seen.chatPosts, 1, `${path}: reached the stub once`);
            assertArrived(seen.stubFrom, bytes, type, path);
          }
        });

        await test(`${door} ${label}: a download that is not an image is refused as invalid_image_data and never reaches the stub`, async () => {
          const heldMain = await ensureTlsProxy(stubPort);
          for (const path of ["/page.html", "/text.png", "/empty.png"]) {
            const servedBefore = servedPaths.length;
            const seen = await observed(() =>
              send(door, `https://${HELD_HOST}${path}`, stream, {
                port: heldMain,
              }),
            );
            assert(
              servedPaths.slice(servedBefore).includes(path),
              `${path}: the origin served the download`,
            );
            assertEqual(seen.chatPosts, 0, `${path}: nothing reached the stub`);
            assertRefusedAsData(door, seen.result, `${door} ${label} ${path}`, [
              canaries.served.token,
              HELD_HOST,
            ]);
            assert(
              !stubSaw(canaries.served.token, seen.stubFrom),
              `${path}: the served bytes never reached the stub`,
            );
          }
        });
      }
    }

    // ------------------------------------------------------- cancellation
    // The proxy waits for a download before it contacts any provider, so a
    // client that has gone must not leave one running. A second proxy sends its
    // https downloads through a CONNECT proxy to an origin that never answers.
    await test("a client that disconnects mid-download stops the https download", async () => {
      const heldMain = await ensureTlsProxy(stubPort);
      const post = (url: string, signal?: AbortSignal): Promise<Response> =>
        fetch(`http://127.0.0.1:${heldMain}/v1/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model: MODEL.openai,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: "describe the image" },
                  { type: "image_url", image_url: { url } },
                ],
              },
            ],
          }),
          signal,
        });
      const chatBefore = chatPosts().length;

      const client = new AbortController();
      const outcome = post(`https://${HELD_HOST}/hold.png`, client.signal).then(
        (response) => response.status,
        () => "client-aborted",
      );

      // Control: the download must be in flight before a closed connection can
      // mean anything.
      const arrived = Date.now() + 30_000;
      while (heldRequests.length === 0 && Date.now() < arrived) {
        await sleep(100);
      }
      const held = heldRequests[0];
      assert(
        held !== undefined,
        "the https download must reach the held origin through HTTPS_PROXY",
      );
      assertEqual(
        held.url,
        "/hold.png",
        "the origin received the image request",
      );
      assert(
        heldConnects.some((target) => target === `${HELD_HOST}:443`),
        "the tunnel was opened to the image host",
      );
      assertEqual(
        held.closed,
        false,
        "the download is in flight while the client waits",
      );

      client.abort();
      const droppedAt = Date.now();
      while (!held.closed && Date.now() - droppedAt < 10_000) {
        await sleep(50);
      }
      assert(
        held.closed,
        "the download must close within 10 s of the client going away (uncancelled it lives until safeDownload's 60 s timeout)",
      );
      assertEqual(
        await outcome,
        "client-aborted",
        "the client saw its own abort",
      );
      await sleep(250);
      assertEqual(
        chatPosts().length - chatBefore,
        0,
        "nothing reached the provider",
      );
    });

    // Last, so a leak anywhere above is reported once, with its own name.
    await test("no canary file ever reached the stub, across the whole run", async () => {
      for (const canary of [
        canaries.png,
        canaries.txt,
        canaries.noext,
        canaries.prompt,
        canaries.relative,
      ]) {
        assert(
          !stubSaw(canary.token),
          "a canary file's bytes reached the stub",
        );
      }
      assert(
        existsSync(canaries.png.file),
        "the canary files were still in place",
      );
    });
  } finally {
    await stopProxy();
    await stopChild(heldProxy);
    stub.close();
    listenerServer.close();
    heldTunnel?.close();
    heldOrigin?.closeAllConnections();
    heldOrigin?.close();
    if (proxyLog.length > 0 && process.env.NEUROLINK_TEST_VERBOSE === "1") {
      console.log(proxyLog.join(""));
      console.log(heldLog.join(""));
    }
  }
});
