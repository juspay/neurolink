#!/usr/bin/env tsx
/**
 * Continuous Test Suite: the agent routes' attachment guard, end to end.
 *
 * `POST /api/agent/execute` and `/api/agent/stream` accept `input.images` and
 * `input.files` as strings, and the SDK resolves a string itself: an `http(s)`
 * URL is fetched (redirects followed, no address check) and anything else is
 * read from the local disk. A caller of a network server must not be able to
 * aim either at the server's own network or disk.
 *
 * Every case drives a surface this package ships (CLAUDE.md rule 15): the
 * public `createServer` + `registerAllRoutes` from `../dist/index.js`, mounted
 * on an in-process Hono adapter and driven through Hono's own `app.request()`
 * (no port, no network), with `NeuroLink` doing the generating. The provider is
 * OpenAI behind `installMockFetch` and a fake key, so what the provider was
 * actually sent is observable and nothing leaves the machine.
 *
 * URL cases that must be refused are checked two ways: the response is a 400,
 * and a TCP listener standing in for the "internal service" counts zero
 * connections. A control proves the listener does count a connection, so a zero
 * is a real negative.
 *
 * A request is also bounded as a whole: attachment count and total bytes
 * (`maxInputAttachments`, `maxInputTotalBytes`), with `data:` URIs charged
 * their string length against the same budget as files.
 *
 * What this suite cannot reach: a *successful* https download, which needs a
 * publicly routable https host, and a redirect to a private address, which
 * needs the same. `safeDownload` itself (address pinning, redirect refusal,
 * size cap) is the shared helper the transcription route already relies on.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-agent-input-guard.ts
 */
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { createServer as createTcpServer } from "node:net";
import type { AddressInfo, Server as TcpServer } from "node:net";
import { basename, join } from "node:path";
import {
  assert,
  assertEqual,
  defineSuite,
  Skip,
  tempDir,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { installMockFetch } from "./utils/mockFetch.js";
import { NeuroLink, createServer, registerAllRoutes } from "../dist/index.js";

assertDistFresh();

// Set before anything can construct a NeuroLink: the repo's tracked
// .mcp-config.json declares a `filesystem` server started via
// `npx -y @modelcontextprotocol/server-filesystem`, with autoDiscovery and
// autoRegister both on, so the first generate() of every instance would try to
// start it and, when it cannot, wait out the MCP client timeout. This suite
// tests what the agent routes do with an attachment, not MCP.
process.env.NEUROLINK_SKIP_MCP = "true";

const { test, runSuite } = defineSuite("Agent routes: attachment guard", {
  offline: true,
});

const SENTINEL = "SENTINEL-OUTSIDE-SECRET-4471";
const MAX_INPUT_BYTES = 4096;

// A syntactically valid 1x1 PNG, the same one the file-intake suite uses.
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const PNG_BYTES = Buffer.from(PNG_BASE64, "base64");

const ALLOWED_ROOT = tempDir("neurolink-agent-allowed-");
const OUTSIDE_ROOT = tempDir("neurolink-agent-outside-");
writeFileSync(join(ALLOWED_ROOT, "inside.png"), PNG_BYTES);
writeFileSync(
  join(ALLOWED_ROOT, "too-big.png"),
  Buffer.alloc(MAX_INPUT_BYTES + 1),
);
// A real PNG padded after IEND to exactly the limit: decoders ignore the tail,
// and the size check must let a file of exactly maxInputBytes through.
writeFileSync(
  join(ALLOWED_ROOT, "at-limit.png"),
  Buffer.concat([PNG_BYTES, Buffer.alloc(MAX_INPUT_BYTES - PNG_BYTES.length)]),
);
writeFileSync(join(ALLOWED_ROOT, "unreadable.png"), PNG_BYTES);
chmodSync(join(ALLOWED_ROOT, "unreadable.png"), 0o000);
writeFileSync(join(OUTSIDE_ROOT, "secret.txt"), SENTINEL);
mkdirSync(join(ALLOWED_ROOT, "nested"));
symlinkSync(join(OUTSIDE_ROOT, "secret.txt"), join(ALLOWED_ROOT, "link.txt"));
const OUTSIDE_SECRET = join(OUTSIDE_ROOT, "secret.txt");

// A data: URI of a valid PNG padded after IEND, so its string length is known
// and a provider can still decode it. 2982 bytes encode to 3976 characters.
const PADDED_DATA_URI = `data:image/png;base64,${Buffer.concat([
  PNG_BYTES,
  Buffer.alloc(2982 - PNG_BYTES.length),
]).toString("base64")}`;
const BOUNDED_MAX_ATTACHMENTS = 3;
const BOUNDED_MAX_TOTAL_BYTES = 10_000;

type HonoLike = {
  request: (path: string, init?: RequestInit) => Promise<Response>;
};

async function buildApp(agent?: {
  allowedInputRoots?: string[];
  maxInputBytes?: number;
  maxInputAttachments?: number;
  maxInputTotalBytes?: number;
}): Promise<HonoLike> {
  const adapter = await createServer(
    new NeuroLink({ conversationMemory: { enabled: false } }),
    { framework: "hono", config: { port: 0, host: "127.0.0.1" } },
  );
  await adapter.initialize();
  registerAllRoutes(adapter, "/api", {
    enableSwagger: true,
    ...(agent ? { agent } : {}),
  });
  return adapter.getFrameworkInstance() as HonoLike;
}

// The default server (no `agent` option), one that names a root, one that also
// bounds a request as a whole, and one whose total budget is below its
// per-attachment cap.
const locked = await buildApp();
const scoped = await buildApp({
  allowedInputRoots: [ALLOWED_ROOT],
  maxInputBytes: MAX_INPUT_BYTES,
});
const bounded = await buildApp({
  allowedInputRoots: [ALLOWED_ROOT],
  maxInputBytes: MAX_INPUT_BYTES,
  maxInputAttachments: BOUNDED_MAX_ATTACHMENTS,
  maxInputTotalBytes: BOUNDED_MAX_TOTAL_BYTES,
});
const TIGHT_TOTAL_BYTES = 3000;
const tight = await buildApp({
  allowedInputRoots: [ALLOWED_ROOT],
  maxInputTotalBytes: TIGHT_TOTAL_BYTES,
});

type Reply = { status: number; text: string; sent: string };

async function post(
  app: HonoLike,
  route: "execute" | "stream",
  input: unknown,
): Promise<Reply> {
  const sent = JSON.stringify({
    input,
    provider: "openai",
    model: "gpt-4o-mini",
  });
  const res = await app.request(`/api/agent/${route}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: sent,
  });
  return { status: res.status, text: await res.text(), sent };
}

/**
 * `execute` answers a refusal with its HTTP status. `stream` answers every
 * error, its own validation errors included, with a 200 event stream whose
 * first frame carries the error code; that is the route's existing convention.
 */
function assertRefused(
  route: "execute" | "stream",
  reply: Reply,
  status: number,
  code: string,
): void {
  if (route === "execute") {
    assertEqual(reply.status, status, "refused with the HTTP status");
    return;
  }
  assert(
    reply.text.includes(`"code":"${code}"`),
    "refused with an error frame carrying the code",
  );
}

function openAIResponse(): unknown {
  return {
    id: "chatcmpl-mock",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "gpt-4o-mini",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "a tiny pixel" },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
  };
}

/** A fake key and a mocked OpenAI, with the provider's recorded requests. */
async function withMockedProvider<T>(
  fn: (providerCalls: () => string[]) => Promise<T>,
): Promise<T> {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalBase = process.env.OPENAI_BASE_URL;
  process.env.OPENAI_API_KEY = "test-fake-openai-credential-for-agent-guard";
  delete process.env.OPENAI_BASE_URL;
  const { unset, calls } = installMockFetch([
    {
      method: "POST",
      url: "api.openai.com/v1/chat/completions",
      respond: { status: 200, json: openAIResponse() },
    },
  ]);
  try {
    return await fn(() => calls.map((c) => c.bodyText));
  } finally {
    unset();
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
    if (originalBase !== undefined) {
      process.env.OPENAI_BASE_URL = originalBase;
    }
  }
}

/** A TCP listener that counts connections, standing in for an internal service. */
async function withInternalService<T>(
  fn: (port: number, connections: () => number) => Promise<T>,
): Promise<T> {
  let count = 0;
  const server: TcpServer = createTcpServer((socket) => {
    count += 1;
    socket.destroy();
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const port = (server.address() as AddressInfo).port;
  try {
    return await fn(port, () => count);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

for (const field of ["images", "files"] as const) {
  for (const route of ["execute", "stream"] as const) {
    await test(`${route}: a local path in input.${field} is refused when the server names no allowed directory, and its content never comes back`, async () => {
      await withMockedProvider(async (providerCalls) => {
        const reply = await post(locked, route, {
          text: "read this",
          [field]: [OUTSIDE_SECRET],
        });
        assertRefused(route, reply, 403, "FORBIDDEN");
        assert(
          !reply.text.includes(SENTINEL),
          "the refusal does not carry the file's content",
        );
        assertEqual(providerCalls().length, 0, "nothing reached the provider");
      });
    });
  }
}

await test("stream: a URL naming an internal address is refused in the stream's error frame", async () => {
  await withMockedProvider(async (providerCalls) => {
    const reply = await post(locked, "stream", {
      text: "x",
      images: ["https://169.254.169.254/latest/meta-data/"],
    });
    assertRefused("stream", reply, 400, "VALIDATION_ERROR");
    assertEqual(providerCalls().length, 0, "nothing reached the provider");
  });
});

await test("outside the allowed directories an existing path and a missing one get the same refusal, so the route is not an oracle for which files exist", async () => {
  // The comparison only means something if the two paths really differ in
  // existence and if the route can tell them apart where it is allowed to.
  assert(existsSync(OUTSIDE_SECRET), "the existing outside path exists");
  const missingOutside = join(OUTSIDE_ROOT, "no-such-file.png");
  assert(!existsSync(missingOutside), "the missing outside path is missing");
  await withMockedProvider(async (providerCalls) => {
    const inside = await post(scoped, "execute", {
      text: "x",
      images: [join(ALLOWED_ROOT, "inside.png")],
    });
    const insideMissing = await post(scoped, "execute", {
      text: "x",
      images: [join(ALLOWED_ROOT, "no-such-file.png")],
    });
    assertEqual(inside.status, 200, "control: inside the root it is served");
    assertEqual(
      insideMissing.status,
      404,
      "control: inside the root a missing file is told apart",
    );
    assert(providerCalls().length > 0, "control: the provider was called");
  });
  await withMockedProvider(async (providerCalls) => {
    for (const app of [locked, scoped]) {
      const present = await post(app, "execute", {
        text: "x",
        images: [OUTSIDE_SECRET],
      });
      const absent = await post(app, "execute", {
        text: "x",
        images: [missingOutside],
      });
      assertEqual(present.status, 403, "an existing outside path is refused");
      assertEqual(absent.status, present.status, "same status either way");
      assertEqual(
        JSON.parse(absent.text).error.message,
        JSON.parse(present.text).error.message,
        "same message either way",
      );
    }
    assertEqual(providerCalls().length, 0, "nothing reached the provider");
  });
});

await test("with an allowed directory named: a path outside it, a `..` escape and a symlink out of it are all refused", async () => {
  // path.join would normalize the `..` away, so the escape is spelled out.
  const escape = `${ALLOWED_ROOT}/../${basename(OUTSIDE_ROOT)}/secret.txt`;
  assert(escape.includes("/../"), "the attempt contains a `..` segment");
  assertEqual(
    realpathSync(escape),
    realpathSync(OUTSIDE_SECRET),
    "the `..` attempt really leads to the secret",
  );
  await withMockedProvider(async (providerCalls) => {
    const attempts = [OUTSIDE_SECRET, escape, join(ALLOWED_ROOT, "link.txt")];
    for (const attempt of attempts) {
      const reply = await post(scoped, "execute", {
        text: "x",
        files: [attempt],
      });
      assert(
        reply.sent.includes(JSON.stringify(attempt).slice(1, -1)),
        "the request carries the attempt as written",
      );
      assertEqual(reply.status, 403, "an escape from the allowed directory");
      assert(
        !reply.text.includes(SENTINEL),
        "the refusal does not carry the file's content",
      );
    }
    assertEqual(providerCalls().length, 0, "nothing reached the provider");
  });
});

await test("a `..` that stays inside the allowed directory is served", async () => {
  const inward = `${ALLOWED_ROOT}/nested/../inside.png`;
  await withMockedProvider(async (providerCalls) => {
    const reply = await post(scoped, "execute", {
      text: "describe this image",
      images: [inward],
    });
    assert(reply.sent.includes("/nested/../"), "the request carries the `..`");
    assertEqual(reply.status, 200, "a `..` that stays inside is allowed");
    assert(
      providerCalls().some((body) => body.includes(PNG_BASE64)),
      "the provider received the file's bytes",
    );
  });
});

await test("with an allowed directory named: a file inside it is read by the server and reaches the provider unchanged", async () => {
  await withMockedProvider(async (providerCalls) => {
    const reply = await post(scoped, "execute", {
      text: "describe this image",
      images: [join(ALLOWED_ROOT, "inside.png")],
    });
    assertEqual(reply.status, 200, "an allowed path is served");
    const sent = providerCalls();
    assert(
      sent.length > 0,
      "the provider was called (control for the zeros above)",
    );
    assert(
      sent.some((body) => body.includes(PNG_BASE64)),
      "the provider received the file's bytes",
    );
  });
});

await test("a file over maxInputBytes is refused with 413, and a directory is refused too", async () => {
  await withMockedProvider(async () => {
    const big = await post(scoped, "execute", {
      text: "x",
      images: [join(ALLOWED_ROOT, "too-big.png")],
    });
    assertEqual(big.status, 413, "oversize attachment");
    const dir = await post(scoped, "execute", {
      text: "x",
      images: [join(ALLOWED_ROOT, "nested")],
    });
    assertEqual(dir.status, 400, "a directory is not an attachment");
  });
});

await test("a file of exactly maxInputBytes is served", async () => {
  await withMockedProvider(async (providerCalls) => {
    const reply = await post(scoped, "execute", {
      text: "describe this image",
      images: [join(ALLOWED_ROOT, "at-limit.png")],
    });
    assertEqual(reply.status, 200, "the limit is inclusive");
    assert(providerCalls().length > 0, "the provider was called");
  });
});

await test("a file inside the root that the server cannot read is refused with 403, not a server error", async () => {
  // Running as root reads the file regardless, so the case cannot fail there.
  let readable = true;
  try {
    readFileSync(join(ALLOWED_ROOT, "unreadable.png"));
  } catch {
    readable = false;
  }
  if (readable) {
    throw new Skip("this process can read a mode-000 file (running as root)");
  }
  await withMockedProvider(async (providerCalls) => {
    const reply = await post(scoped, "execute", {
      text: "x",
      images: [join(ALLOWED_ROOT, "unreadable.png")],
    });
    assertEqual(reply.status, 403, "refused, and not a 500");
    assertEqual(providerCalls().length, 0, "nothing reached the provider");
  });
});

await test("a data: URI still works on a default server (the path callers already use is unchanged)", async () => {
  await withMockedProvider(async (providerCalls) => {
    const reply = await post(locked, "execute", {
      text: "describe this image",
      images: [`data:image/png;base64,${PNG_BASE64}`],
    });
    assertEqual(reply.status, 200, "data URI accepted");
    assert(
      providerCalls().some((body) => body.includes(PNG_BASE64)),
      "the provider received the image",
    );
  });
});

await test("a plain-text request is unchanged", async () => {
  await withMockedProvider(async (providerCalls) => {
    const reply = await post(locked, "execute", "hello");
    assertEqual(reply.status, 200, "plain string input");
    assert(providerCalls().length > 0, "the provider was called");
  });
});

await test("URLs that name an internal address are refused before any connection is made", async () => {
  await withInternalService(async (port, connections) => {
    await withMockedProvider(async (providerCalls) => {
      const targets = [
        `http://127.0.0.1:${port}/a.png`,
        `https://127.0.0.1:${port}/a.png`,
        `https://localhost:${port}/a.png`,
        `https://[::1]:${port}/a.png`,
        `https://2130706433:${port}/a.png`,
        `https://0x7f.0.0.1:${port}/a.png`,
        "https://169.254.169.254/latest/meta-data/",
        "https://[::ffff:169.254.169.254]/latest/meta-data/",
      ];
      for (const field of ["images", "files"] as const) {
        for (const url of targets) {
          const reply = await post(locked, "execute", {
            text: "x",
            [field]: [url],
          });
          assertEqual(reply.status, 400, `internal URL in input.${field}`);
        }
      }
      assertEqual(connections(), 0, "the internal service saw no connection");
      assertEqual(providerCalls().length, 0, "nothing reached the provider");
    });
  });
});

await test("control: the internal-service listener does count a connection that is made", async () => {
  await withInternalService(async (port, connections) => {
    const { connect } = await import("node:net");
    await new Promise<void>((resolve) => {
      const socket = connect(port, "127.0.0.1", () => socket.end());
      socket.on("close", () => resolve());
    });
    // The server counts on 'connection', which fires just after the client's.
    await new Promise((resolve) => setTimeout(resolve, 50));
    assertEqual(connections(), 1, "the listener counts connections");
  });
});

await test("unsupported schemes and case variants are refused, not guessed at", async () => {
  await withMockedProvider(async () => {
    const entries = [
      "file:///etc/passwd",
      "ftp://example.com/a.png",
      "DATA:image/png;base64,AAAA",
      "gopher://example.com/",
    ];
    for (const entry of entries) {
      const reply = await post(locked, "execute", {
        text: "x",
        images: [entry],
      });
      assertEqual(reply.status, 400, "a scheme the server does not resolve");
    }
    const spaced = await post(locked, "execute", {
      text: "x",
      images: [" https://127.0.0.1/a.png"],
    });
    assertEqual(
      spaced.status,
      403,
      "a padded URL is treated as a path, and refused",
    );
  });
});

/** The text of the error a refusal carries, for an `execute` reply. */
function errorMessage(reply: Reply): string {
  return String(JSON.parse(reply.text).error.message);
}

await test("more attachments than maxInputAttachments is refused with 413 before any attachment is read, on both routes", async () => {
  // A path that does not exist would be a 404 if the first entry were
  // resolved, so a 413 shows the count was judged first.
  const missing = join(ALLOWED_ROOT, "no-such-file.png");
  for (const route of ["execute", "stream"] as const) {
    await withMockedProvider(async (providerCalls) => {
      const reply = await post(bounded, route, {
        text: "x",
        images: [missing, missing],
        files: [missing, missing],
      });
      assertRefused(route, reply, 413, "PAYLOAD_TOO_LARGE");
      assertEqual(providerCalls().length, 0, "nothing reached the provider");
    });
  }
  await withMockedProvider(async (providerCalls) => {
    // Control: the limit counts images and files together, and is inclusive.
    const atLimit = await post(bounded, "execute", {
      text: "describe this image",
      images: [join(ALLOWED_ROOT, "inside.png"), PADDED_DATA_URI],
      files: [join(ALLOWED_ROOT, "inside.png")],
    });
    assertEqual(atLimit.status, 200, "exactly the limit is served");
    assert(providerCalls().length > 0, "the provider was called");
  });
});

await test("the default limit is 20 attachments, images and files together", async () => {
  const image = `data:image/png;base64,${PNG_BASE64}`;
  const note = `data:text/plain;base64,${Buffer.from("a short note").toString("base64")}`;
  // OpenAI takes at most ten images, so twenty are split across both lists.
  const split = (images: number, files: number) => ({
    text: "describe these",
    images: Array.from({ length: images }, () => image),
    files: Array.from({ length: files }, () => note),
  });
  await withMockedProvider(async (providerCalls) => {
    const over = await post(locked, "execute", split(10, 11));
    assertEqual(over.status, 413, "21 attachments are too many");
    assertEqual(providerCalls().length, 0, "nothing reached the provider");
  });
  await withMockedProvider(async (providerCalls) => {
    const ok = await post(locked, "execute", split(10, 10));
    assertEqual(ok.status, 200, "20 attachments are served");
    assert(providerCalls().length > 0, "the provider was called");
  });
});

await test("allowed files that each fit maxInputBytes but not maxInputTotalBytes together are refused with 413 and the budget is shared by images and files", async () => {
  const atLimit = join(ALLOWED_ROOT, "at-limit.png");
  await withMockedProvider(async (providerCalls) => {
    // Control: each file fits alone, and two together (8192 bytes) fit the
    // budget, so it is the third that overflows it.
    const one = await post(bounded, "execute", {
      text: "describe this image",
      images: [atLimit],
    });
    const two = await post(bounded, "execute", {
      text: "describe these images",
      images: [atLimit, atLimit],
    });
    assertEqual(one.status, 200, "one file fits");
    assertEqual(two.status, 200, "two files fit the budget");
    assert(providerCalls().length > 0, "the provider was called");
  });
  await withMockedProvider(async (providerCalls) => {
    const three = await post(bounded, "execute", {
      text: "x",
      images: [atLimit, atLimit],
      files: [atLimit],
    });
    assertEqual(three.status, 413, "three files overflow the budget");
    assert(
      errorMessage(three).includes("together"),
      "the refusal names the shared budget",
    );
    assertEqual(providerCalls().length, 0, "nothing reached the provider");
  });
  await withMockedProvider(async (providerCalls) => {
    // Two padded data: URIs (7996 characters) leave 2004 bytes of the budget,
    // which a 4096-byte file in the other list does not fit.
    const mixed = await post(bounded, "execute", {
      text: "x",
      images: [PADDED_DATA_URI, PADDED_DATA_URI],
      files: [atLimit],
    });
    assertEqual(mixed.status, 413, "images and files draw on one budget");
    assert(
      errorMessage(mixed).includes("together"),
      "the refusal names the shared budget",
    );
    assertEqual(providerCalls().length, 0, "nothing reached the provider");
  });
});

await test("a data: URI over maxInputBytes is refused with 413, and data: URIs count toward maxInputTotalBytes", async () => {
  const oversize = `data:image/png;base64,${"A".repeat(MAX_INPUT_BYTES)}`;
  assert(
    oversize.length > MAX_INPUT_BYTES,
    "the data: URI is over the per-attachment cap",
  );
  assert(
    PADDED_DATA_URI.length <= MAX_INPUT_BYTES,
    "the padded data: URI fits the per-attachment cap",
  );
  for (const route of ["execute", "stream"] as const) {
    await withMockedProvider(async (providerCalls) => {
      const reply = await post(bounded, route, {
        text: "x",
        files: [oversize],
      });
      assertRefused(route, reply, 413, "PAYLOAD_TOO_LARGE");
      assertEqual(providerCalls().length, 0, "nothing reached the provider");
    });
  }
  await withMockedProvider(async (providerCalls) => {
    // Control: two padded data: URIs (7996 characters) fit the budget...
    const two = await post(bounded, "execute", {
      text: "describe these images",
      images: [PADDED_DATA_URI, PADDED_DATA_URI],
    });
    assertEqual(two.status, 200, "two data: URIs fit the budget");
    assert(providerCalls().length > 0, "the provider was called");
  });
  await withMockedProvider(async (providerCalls) => {
    // ...and each is under the per-attachment cap, so it is the third that
    // overflows the shared budget.
    const three = await post(bounded, "execute", {
      text: "x",
      images: [PADDED_DATA_URI, PADDED_DATA_URI, PADDED_DATA_URI],
    });
    assertEqual(three.status, 413, "three data: URIs overflow the budget");
    assert(
      errorMessage(three).includes("together"),
      "the refusal names the shared budget",
    );
    assertEqual(providerCalls().length, 0, "nothing reached the provider");
  });
});

await test("a total budget below maxInputBytes is the per-attachment cap too", async () => {
  await withMockedProvider(async (providerCalls) => {
    // at-limit.png is 4096 bytes, under the 50 MiB maxInputBytes default and
    // over this server's 3000-byte total.
    const file = await post(tight, "execute", {
      text: "x",
      images: [join(ALLOWED_ROOT, "at-limit.png")],
    });
    assertEqual(file.status, 413, "a file over the total budget");
    assert(
      errorMessage(file).includes(`${TIGHT_TOTAL_BYTES}-byte`),
      "the refusal names the effective cap",
    );
    const data = await post(tight, "execute", {
      text: "x",
      images: [`data:image/png;base64,${"A".repeat(TIGHT_TOTAL_BYTES)}`],
    });
    assertEqual(data.status, 413, "a data: URI over the total budget");
    assertEqual(providerCalls().length, 0, "nothing reached the provider");
  });
  await withMockedProvider(async (providerCalls) => {
    const small = await post(tight, "execute", {
      text: "describe this image",
      images: [join(ALLOWED_ROOT, "inside.png")],
    });
    assertEqual(small.status, 200, "control: a small file is served");
    assert(providerCalls().length > 0, "the provider was called");
  });
});

await test("a file-system error no check anticipated is a refusal that names no path, not a 500", async () => {
  if (process.platform === "win32") {
    throw new Skip("unix domain sockets are not files on Windows");
  }
  const socketPath = join(ALLOWED_ROOT, "s.sock");
  if (socketPath.length > 100) {
    throw new Skip("the temp directory path is too long for a unix socket");
  }
  const listener = createTcpServer();
  await new Promise<void>((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(socketPath, () => resolve());
  });
  try {
    // Preconditions: the fixture is a socket, and opening it as the route does
    // fails with something the route had no mapping for (ENXIO on Linux, an
    // errno Node has no name for on macOS), so a refusal below came from the
    // new mapping and not from an old one.
    assert(statSync(socketPath).isSocket(), "the fixture is a socket");
    let openFailed = false;
    let openCode: string | undefined;
    try {
      closeSync(
        openSync(socketPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW),
      );
    } catch (error) {
      openFailed = true;
      openCode = (error as NodeJS.ErrnoException).code;
    }
    assert(openFailed, "opening the socket fails");
    assert(
      !["ENOENT", "EACCES", "EPERM", "ELOOP"].includes(openCode ?? ""),
      "the failure is not one of the codes the route mapped before",
    );
    await withMockedProvider(async (providerCalls) => {
      // A socket is refused as unreadable (403) or as not a file (400),
      // depending on the errno the platform gives; a NUL byte in the path is a
      // 400 on every platform.
      const attempts: Array<[string, number[]]> = [
        [socketPath, [400, 403]],
        [`${ALLOWED_ROOT}/bad\u0000name.png`, [400]],
      ];
      for (const [attempt, statuses] of attempts) {
        for (const route of ["execute", "stream"] as const) {
          const reply = await post(scoped, route, {
            text: "x",
            images: [attempt],
          });
          if (route === "execute") {
            assert(
              statuses.includes(reply.status),
              "refused as a client error, not a 500",
            );
          } else {
            assert(
              /"code":"(VALIDATION_ERROR|FORBIDDEN)"/.test(reply.text),
              "refused with an error frame carrying a client-error code",
            );
          }
          assert(
            !reply.text.includes(ALLOWED_ROOT),
            "the refusal names no server path",
          );
          assert(
            !reply.text.includes("ERR_") &&
              !reply.text.includes("system error") &&
              (openCode === undefined || !reply.text.includes(openCode)),
            "the refusal carries no raw error text",
          );
        }
      }
      assertEqual(providerCalls().length, 0, "nothing reached the provider");
    });
  } finally {
    await new Promise<void>((resolve) => listener.close(() => resolve()));
  }
});

await test("a FIFO inside the root is refused at once as not a file, instead of holding a worker until a writer appears", async () => {
  if (process.platform === "win32") {
    throw new Skip("POSIX FIFOs do not exist on Windows");
  }
  const fifoPath = join(ALLOWED_ROOT, "pipe.png");
  const made = spawnSync("mkfifo", [fifoPath]);
  if (made.status !== 0) {
    throw new Skip("mkfifo is not available here");
  }
  // Release any reader still blocked on the FIFO (the unfixed code), so a
  // failing run does not leave a libuv worker parked behind it.
  const releaseReader = (): void => {
    try {
      closeSync(
        openSync(fifoPath, fsConstants.O_WRONLY | fsConstants.O_NONBLOCK),
      );
    } catch {
      // No reader waiting: nothing to release.
    }
  };
  try {
    assert(statSync(fifoPath).isFIFO(), "the fixture is a FIFO");
    await withMockedProvider(async (providerCalls) => {
      for (const route of ["execute", "stream"] as const) {
        let timedOut = false;
        const reply = await Promise.race([
          post(scoped, route, { text: "x", images: [fifoPath] }),
          new Promise<Reply>((resolve) =>
            setTimeout(() => {
              timedOut = true;
              resolve({ status: 0, text: "", sent: "" });
            }, 5000),
          ),
        ]);
        if (timedOut) {
          releaseReader();
        }
        assert(!timedOut, "the route answered within 5 s");
        if (route === "execute") {
          assertEqual(reply.status, 400, "a FIFO is not a file");
        } else {
          assert(
            reply.text.includes('"code":"VALIDATION_ERROR"'),
            "refused with an error frame carrying VALIDATION_ERROR",
          );
        }
        assert(
          !reply.text.includes(ALLOWED_ROOT),
          "the refusal names no server path",
        );
      }
      assertEqual(providerCalls().length, 0, "nothing reached the provider");
    });
  } finally {
    releaseReader();
    rmSync(fifoPath, { force: true });
  }
});

await test("the OpenAPI description of input.images and input.files matches what the route accepts", async () => {
  const res = await scoped.request("/api/openapi.json");
  assertEqual(res.status, 200, "the spec is served");
  const { data: spec } = (await res.json()) as {
    data: {
      components: {
        schemas: {
          AgentInput: {
            oneOf: Array<{
              properties?: Record<string, { description?: string }>;
            }>;
          };
        };
      };
    };
  };
  const properties = spec.components.schemas.AgentInput.oneOf
    .map((variant) => variant.properties)
    .find((candidate) => candidate !== undefined);
  assert(properties !== undefined, "the object form of input is described");
  for (const field of ["images", "files"]) {
    const description = properties?.[field]?.description ?? "";
    assert(description.includes("data: URI"), `${field}: names data: URIs`);
    assert(description.includes("https"), `${field}: names https URLs`);
    assert(
      description.includes("allowedInputRoots"),
      `${field}: names the allowed directories`,
    );
    assert(
      !description.includes("URLs or base64 data") &&
        !description.includes("file paths or URLs"),
      `${field}: no longer promises what the route refuses`,
    );
  }
  await withMockedProvider(async (providerCalls) => {
    // The old text promised "base64 data". A bare base64 string is read as a
    // path, so it is refused.
    const reply = await post(locked, "execute", {
      text: "x",
      images: [PNG_BASE64],
    });
    assertEqual(reply.status, 403, "bare base64 is not an attachment");
    assertEqual(providerCalls().length, 0, "nothing reached the provider");
  });
});

await runSuite();
