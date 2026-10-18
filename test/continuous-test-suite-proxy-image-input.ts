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
 * decodable length is taken for bytes, anything else is refused as before),
 * and that the 20-image limit counts converted images.
 *
 * Two controls make the negatives mean something. The URL listener is proven
 * to count a connection before any zero is read, and the stub is proven to
 * receive a canary the proxy was handed legitimately (as a `data:` URI) before
 * "the stub never saw the canary" is read as a result.
 *
 * One case reaches past the refusals: a client that disconnects while an
 * `https://` image is still downloading must stop the download. A second proxy
 * is started with `HTTPS_PROXY` pointing at a loopback CONNECT proxy that
 * tunnels to a local TLS origin which accepts the request and never answers
 * (behind a proxy only the URL text is vetted, so a public-looking name passes
 * and nothing is resolved or contacted; the origin's throwaway certificate,
 * generated with `openssl`, is trusted only by that child through
 * `NODE_EXTRA_CA_CERTS`). The case waits for the origin to receive the
 * request, which proves the download is in flight, drops the client, and
 * requires the origin's connection to close well inside `safeDownload`'s 60 s
 * timeout.
 *
 * What this suite cannot reach: a *successful* https download, which needs a
 * publicly routable https host, and a redirect to a private address, which
 * needs the same. `safeDownload` itself (address pinning, redirect refusal,
 * size cap) is the helper the agent routes and the transcription route already
 * rely on, covered by test/continuous-test-suite-agent-input-guard.ts. For the
 * same reason the signal check *between* two references (stop before starting
 * the next one) has no deterministic case here: it needs a download that
 * finishes.
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

// ------------------------------------------------------------ held origin
// A CONNECT proxy that tunnels to a local TLS origin which reads the request
// and never answers, so a download routed through it stays in flight until
// something cancels it. Built by the case that needs it.
type HeldRequest = { url: string; closed: boolean };
const heldRequests: HeldRequest[] = [];
const heldConnects: string[] = [];
const heldLog: string[] = [];
const HELD_HOST = "images.example.com";
let heldOrigin: HttpsServer | undefined;
let heldTunnel: HttpServer | undefined;

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
    (req) => {
      const held: HeldRequest = { url: req.url ?? "", closed: false };
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

// ----------------------------------------------------------------------- cases
type Reply = { status: number; text: string; contentType: string };

function buildRequest(
  door: Door,
  reference: string | undefined,
  stream: boolean,
  options: {
    port?: number;
    asBase64Source?: boolean;
    /** Gemini only: the part's `mimeType`; `null` leaves the field out. */
    mimeType?: string | null;
  } = {},
): { url: string; body: unknown } {
  const base = `http://127.0.0.1:${options.port ?? mainPort}`;
  const text = "describe the image";
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
                : [
                    { type: "text", text },
                    { type: "image_url", image_url: { url: reference } },
                  ],
          },
        ],
      },
    };
  }
  if (door === "claude" || door === "claude-fallback") {
    const base64 = reference?.match(/^data:[^;]+;base64,(.+)$/)?.[1];
    const source =
      options.asBase64Source && base64
        ? { type: "base64", media_type: "image/png", data: base64 }
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
                : [
                    { type: "text", text },
                    { type: "image", source },
                  ],
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
              : [
                  { text },
                  {
                    inlineData: {
                      ...(mimeType === null ? {} : { mimeType }),
                      data: reference,
                    },
                  },
                ],
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
    mimeType?: string | null;
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
function stubImageBytes(from: number): Buffer[] {
  const out: Buffer[] = [];
  for (const record of stubRequests.slice(from)) {
    for (const match of record.raw.matchAll(
      /data:image\/[a-z+.-]+;base64,([A-Za-z0-9+/=]+)/g,
    )) {
      out.push(Buffer.from(match[1], "base64"));
    }
  }
  return out;
}

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
            // spell. They are decoded as such and the file is not opened.
            assertEqual(seen.result.status, 200, `${name}: taken for bytes`);
            assertEqual(seen.chatPosts, 1, `${name}: reached the stub once`);
            assert(
              stubImageBytes(seen.stubFrom).some((got) =>
                got.equals(Buffer.from(reference, "base64")),
              ),
              `${name}: the stub got the decoded text, not the file`,
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

    // ------------------------------------------------------- cancellation
    // The proxy waits for a download before it contacts any provider, so a
    // client that has gone must not leave one running. A second proxy sends its
    // https downloads through a CONNECT proxy to an origin that never answers.
    await test("a client that disconnects mid-download stops the https download", async () => {
      const { proxyUrl, certFile } = await startHeldOrigin();
      const heldMain = await freePort();
      heldProxy = await launchProxy(
        childEnv(stubPort, HOME_HELD, {
          HTTPS_PROXY: proxyUrl,
          NODE_EXTRA_CA_CERTS: certFile,
        }),
        { main: heldMain },
        heldLog,
      );
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
