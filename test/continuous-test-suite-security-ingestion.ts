#!/usr/bin/env tsx
/**
 * Continuous Test Suite: attachment ingestion hardening (2026-10 security
 * hardening).
 *
 * ## Determinism exception (CLAUDE.md rule 15)
 *
 * This suite sits outside the end-to-end rule on purpose, and is listed in the
 * `allow` list of `neurolink/e2e-tests-only` in eslint.config.js. What
 * determinism buys: every case here is about what a loader did NOT do — a
 * loopback server that received no request, a redirect hop that was never
 * taken, a file outside the roots that was never opened, a temp directory
 * created with a specific mode. A live `generate()` cannot show any of that:
 * the only observable is a provider answer, and the attack the loader is
 * refusing is a request to a host that must not exist on a CI runner. So the
 * suite drives the SDK (`NeuroLink.generate`, `runTranscribe`, `WebLoader`,
 * `prepareRAGTool`, the processors, the stores) against loopback HTTP servers
 * and temporary directories it owns, and asserts on what those saw.
 *
 * One module graph per suite: everything comes from `src`, including
 * `NeuroLink` itself. The model behind `generate()` is a loopback
 * OpenAI-compatible endpoint that records what it was sent and answers a
 * canned completion — no provider is reached, no key is read.
 *
 * Assertion messages never quote payloads, URLs or file contents (see
 * CLAUDE.md, "Keep payloads out of assertion messages").
 *
 * Run: pnpm exec tsx test/continuous-test-suite-security-ingestion.ts
 */
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32 } from "node:zlib";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import {
  AttachmentRefusedError,
  downloadAttachment,
  readAttachmentFile,
  resetAttachmentRootsWarning,
  resolveAttachmentPolicy,
} from "../src/lib/utils/attachmentPolicy.js";
import { safeDownloadWithMeta } from "../src/lib/utils/safeFetch.js";
import { validateAndResolveUrl } from "../src/lib/utils/ssrfGuard.js";
import { runTranscribe } from "../src/lib/voice/transcribe.js";
import { WebLoader } from "../src/lib/rag/document/loaders.js";
import { prepareRAGTool } from "../src/lib/rag/ragIntegration.js";
import { archiveProcessor } from "../src/lib/processors/archive/ArchiveProcessor.js";
import {
  boundedJsonStringify,
  yamlProcessor,
} from "../src/lib/processors/data/YamlProcessor.js";
import { FileReferenceRegistry } from "../src/lib/files/fileReferenceRegistry.js";
import {
  createTrackedTempDir,
  withInputHardening,
} from "../src/lib/adapters/video/ffmpegAdapter.js";
import { LocalTempArtifactStore } from "../src/lib/artifacts/artifactStore.js";
import { assertSafeRedisId, getSessionKey } from "../src/lib/utils/redis.js";
import { FileSystemSkillStore } from "../src/lib/skills/skillStores.js";
import { assertSafeStoreId } from "../src/lib/utils/safeStoreId.js";
import { logger } from "../src/lib/utils/logger.js";
import {
  safeDebugSerialize,
  sanitizeRecord,
} from "../src/lib/utils/logSanitize.js";
import { updateEnvFile } from "../src/cli/utils/envManager.js";
import { GoogleSTT } from "../src/lib/voice/providers/GoogleSTT.js";
import type {
  AttachmentPolicy,
  STTResult,
  TranscribeDeps,
} from "../src/lib/types/index.js";

const { test, section, runSuite } = defineSuite("Security: ingestion", {
  offline: true,
});

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------

type SeenRequest = {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
};

type Loopback = {
  server: Server;
  port: number;
  origin: string;
  requests: SeenRequest[];
  close: () => Promise<void>;
};

/** A loopback HTTP server that records every request before `handler` answers it. */
async function loopback(
  handler: (req: SeenRequest, res: ServerResponse) => void,
): Promise<Loopback> {
  const requests: SeenRequest[] = [];
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const seen: SeenRequest = {
        method: req.method ?? "",
        url: req.url ?? "",
        headers: req.headers,
        body: Buffer.concat(chunks),
      };
      requests.push(seen);
      handler(seen, res);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  return {
    server,
    port,
    origin: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

/** 1×1 transparent PNG. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

function servePng(_req: SeenRequest, res: ServerResponse): void {
  res.writeHead(200, {
    "content-type": "image/png",
    "content-length": String(TINY_PNG.length),
  });
  res.end(TINY_PNG);
}

/** A fake OpenAI-compatible chat endpoint: records bodies, answers a canned completion. */
function fakeChatCompletions(req: SeenRequest, res: ServerResponse): void {
  if (!req.url.endsWith("/chat/completions")) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: "unknown route" } }));
    return;
  }
  const body = JSON.stringify({
    id: "chatcmpl-loopback",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "test-model",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "ok" },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
  });
  res.writeHead(200, { "content-type": "application/json" });
  res.end(body);
}

/** Every `messages[*].content` part of every chat request the fake endpoint saw. */
function chatParts(server: Loopback): unknown[] {
  const parts: unknown[] = [];
  for (const req of server.requests) {
    if (!req.url.endsWith("/chat/completions")) {
      continue;
    }
    const parsed = JSON.parse(req.body.toString("utf8")) as {
      messages?: Array<{ content?: unknown }>;
    };
    for (const message of parsed.messages ?? []) {
      if (Array.isArray(message.content)) {
        parts.push(...message.content);
      } else if (message.content !== undefined) {
        parts.push(message.content);
      }
    }
  }
  return parts;
}

function chatText(server: Loopback): string {
  return chatParts(server)
    .map((part) =>
      typeof part === "string"
        ? part
        : typeof (part as { text?: unknown }).text === "string"
          ? (part as { text: string }).text
          : "",
    )
    .join("\n");
}

function chatImageCount(server: Loopback): number {
  return chatParts(server).filter(
    (part) =>
      typeof part === "object" &&
      part !== null &&
      ((part as { type?: unknown }).type === "image_url" ||
        (part as { type?: unknown }).type === "image"),
  ).length;
}

function scratch(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `nl-sec-ingest-${prefix}-`));
}

function policy(
  overrides: Parameters<typeof resolveAttachmentPolicy>[0] = {},
): AttachmentPolicy {
  return resolveAttachmentPolicy(overrides);
}

const OPEN_LOOPBACK = {
  allowInsecureUrls: true,
  allowPrivateNetwork: true,
} as const;

async function rejects(
  run: () => Promise<unknown>,
): Promise<{ message: string; code: string | undefined }> {
  try {
    await run();
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : String(error),
      code: (error as { code?: unknown } | null)?.code as string | undefined,
    };
  }
  throw new Error("expected the call to reject, but it resolved");
}

/** A 16 kHz mono PCM16 WAV of `seconds` of silence. */
function silentWav(seconds: number): Buffer {
  const dataLength = Math.floor(seconds * 16000) * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(16000, 24);
  header.writeUInt32LE(32000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);
  return Buffer.concat([header, Buffer.alloc(dataLength)]);
}

/** Stub transcription deps: one engine that records the bytes it was handed. */
function transcribeDeps(
  attachmentPolicy: AttachmentPolicy | undefined,
): TranscribeDeps & { heard: number[] } {
  const heard: number[] = [];
  const result: STTResult = {
    text: "hello",
    confidence: 1,
    metadata: { latency: 0 },
  };
  return {
    heard,
    transcribe: async (audio) => {
      heard.push(audio.length);
      return result;
    },
    resolveProvider: (name) => name?.trim() || "primary",
    getHandler: () => undefined,
    decide: async () => null,
    rewrite: async () => {
      throw new Error("no rewrite model in this suite");
    },
    attachmentPolicy,
  };
}

/** A STORED-only ZIP with the given members, in order — duplicates allowed. */
function buildZip(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const crc = crc32(entry.data) >>> 0;
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(entry.data.length, 18);
    lh.writeUInt32LE(entry.data.length, 22);
    lh.writeUInt16LE(name.length, 26);
    lh.writeUInt16LE(0, 28);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(0, 12);
    ch.writeUInt16LE(0, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(entry.data.length, 20);
    ch.writeUInt32LE(entry.data.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt16LE(0, 30);
    ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34);
    ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);
    local.push(lh, name, entry.data);
    central.push(ch, name);
    offset += lh.length + name.length + entry.data.length;
  }
  const directory = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...local, directory, eocd]);
}

/** `levels` of ten-way aliases: a few hundred bytes that expand to 10^levels items. */
function aliasBomb(levels: number): string {
  const lines = [
    'l0: &l0 ["lol", "lol", "lol", "lol", "lol", "lol", "lol", "lol", "lol", "lol"]',
  ];
  for (let i = 1; i <= levels; i++) {
    const ref = `*l${i - 1}`;
    lines.push(
      `l${i}: &l${i} [${Array.from({ length: 10 }, () => ref).join(", ")}]`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withEnv<T>(
  vars: Record<string, string | undefined>,
  run: () => Promise<T>,
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  return run().finally(() => {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

type NeuroLinkModule = typeof import("../src/lib/neurolink.js");
let neurolinkModule: NeuroLinkModule | undefined;

/**
 * `NeuroLink` is imported lazily so the env that steers its `.env` loading
 * and the fake provider endpoint is in place before the module body runs.
 */
async function loadNeuroLink(
  chat: Loopback,
): Promise<NeuroLinkModule["NeuroLink"]> {
  process.env.DOTENV_CONFIG_PATH = "/dev/null";
  // LM Studio is an OpenAI-compatible local provider that NeuroLink lists as
  // vision-capable, so an image part reaches the recorded request.
  process.env.LM_STUDIO_BASE_URL = `${chat.origin}/v1`;
  neurolinkModule ??= await import("../src/lib/neurolink.js");
  return neurolinkModule.NeuroLink;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

await runSuite(async () => {
  const chat = await loopback(fakeChatCompletions);
  const images = await loopback(servePng);
  const NeuroLink = await loadNeuroLink(chat);
  const generateOptions = {
    provider: "lm-studio",
    // A name on the lm-studio vision list, so the image part is sent rather
    // than refused as "no vision" before the loader is reached.
    model: "llava",
    disableTools: true,
    enableAnalytics: false,
    enableEvaluation: false,
  } as const;

  try {
    section("D2 — URL loaders go through the SSRF guard");

    await test("1. generate(): a loopback image URL is never fetched under the default policy", async () => {
      images.requests.length = 0;
      chat.requests.length = 0;
      const nl = new NeuroLink();
      const result = await nl.generate({
        ...generateOptions,
        input: {
          text: "describe",
          images: [`${images.origin}/default-${Date.now()}.png`],
        },
      });
      assert(
        typeof result.content === "string",
        "generate returned no content",
      );
      assertEqual(
        images.requests.length,
        0,
        "the loopback image server received a request",
      );
      assertEqual(
        chatImageCount(chat),
        0,
        "an image part reached the provider",
      );
    });

    await test("2. generate(): the same URL is fetched once when the instance opens private + insecure", async () => {
      images.requests.length = 0;
      chat.requests.length = 0;
      const nl = new NeuroLink({ attachments: OPEN_LOOPBACK });
      await nl.generate({
        ...generateOptions,
        input: {
          text: "describe",
          images: [`${images.origin}/opened-${Date.now()}.png`],
        },
      });
      assertEqual(
        images.requests.length,
        1,
        "the loopback image server did not receive exactly one request",
      );
      assertEqual(
        chatImageCount(chat),
        1,
        "the provider did not receive exactly one image part",
      );
    });

    await test("3. generate(): a loopback URL in input.files is refused before any request, and the call fails", async () => {
      images.requests.length = 0;
      chat.requests.length = 0;
      const nl = new NeuroLink();
      const failure = await rejects(() =>
        nl.generate({
          ...generateOptions,
          input: {
            text: "read",
            files: [`${images.origin}/doc-${Date.now()}.png`],
          },
        }),
      );
      assert(failure.message.length > 0, "no error message");
      assertEqual(
        images.requests.length,
        0,
        "the loopback server received a request",
      );
      assertEqual(
        chat.requests.length,
        0,
        "the provider was called after a refused attachment",
      );
    });

    await test("4. a link-local metadata URL is refused with no connection, and is accepted only by allowPrivateNetwork", async () => {
      const refused = await rejects(() =>
        downloadAttachment("https://169.254.169.254/latest/meta-data/", {
          policy: policy(),
          maxBytes: 1024,
          label: "probe",
        }),
      );
      assertEqual(refused.code, "ATTACHMENT_URL_REFUSED", "wrong refusal code");
      assert(
        refused.message.includes("allowPrivateNetwork"),
        "refusal does not name the switch",
      );
      const strict = await rejects(() =>
        validateAndResolveUrl("https://169.254.169.254/"),
      );
      assert(
        strict.message.includes("blocked range"),
        "guard did not report the blocked range",
      );
      const opened = await validateAndResolveUrl("https://169.254.169.254/", {
        allowPrivateNetwork: true,
      });
      assertEqual(
        opened.ip,
        "169.254.169.254",
        "opened guard changed the address",
      );
      const insecure = await rejects(() =>
        validateAndResolveUrl("http://example.com/"),
      );
      assert(
        insecure.message.includes("HTTPS"),
        "http was not refused by default",
      );
    });

    await test("5. a redirect is followed only hop-by-hop and the caller's headers never reach the target", async () => {
      const target = await loopback(servePng);
      const hop = await loopback((_req, res) => {
        res.writeHead(302, { location: `${target.origin}/final.png` });
        res.end();
      });
      try {
        const result = await safeDownloadWithMeta(`${hop.origin}/start`, {
          maxBytes: 1024 * 1024,
          label: "redirect",
          allowInsecure: true,
          allowPrivateNetwork: true,
          maxRedirects: 5,
          headers: {
            authorization: "Bearer first-hop-only",
            "x-test-marker": "1",
          },
        });
        assertEqual(result.redirects, 1, "wrong hop count");
        assertEqual(
          result.buffer.length,
          TINY_PNG.length,
          "final body length mismatch",
        );
        assertEqual(hop.requests.length, 1, "first hop count");
        assertEqual(target.requests.length, 1, "target hop count");
        assert(
          hop.requests[0].headers.authorization !== undefined,
          "first hop did not get the header",
        );
        assertEqual(
          target.requests[0].headers.authorization,
          undefined,
          "authorization was replayed to the redirect target",
        );
        assertEqual(
          target.requests[0].headers["x-test-marker"],
          undefined,
          "a caller header was replayed to the redirect target",
        );
      } finally {
        await hop.close();
        await target.close();
      }
    });

    await test("6. a redirect is refused outright when redirects are off, and a non-http hop is refused", async () => {
      const target = await loopback(servePng);
      const toFtp = await loopback((_req, res) => {
        res.writeHead(302, { location: "ftp://127.0.0.1/evil" });
        res.end();
      });
      const toTarget = await loopback((_req, res) => {
        res.writeHead(302, { location: `${target.origin}/final.png` });
        res.end();
      });
      try {
        const off = await rejects(() =>
          downloadAttachment(`${toTarget.origin}/start`, {
            policy: policy({ ...OPEN_LOOPBACK, followRedirects: false }),
            maxBytes: 1024,
            label: "no-redirects",
          }),
        );
        assert(
          off.message.includes("redirect"),
          "redirect refusal not reported",
        );
        assertEqual(
          target.requests.length,
          0,
          "target was reached with redirects off",
        );
        const ftp = await rejects(() =>
          downloadAttachment(`${toFtp.origin}/start`, {
            policy: policy(OPEN_LOOPBACK),
            maxBytes: 1024,
            label: "ftp-hop",
          }),
        );
        assert(ftp.message.length > 0, "ftp hop was not refused");
        assertEqual(
          toFtp.requests.length,
          1,
          "first hop count for the ftp case",
        );
      } finally {
        await toFtp.close();
        await toTarget.close();
        await target.close();
      }
    });

    await test("7. transcribe(): an audio URL on loopback is refused by default and fetched once when opened", async () => {
      const audio = await loopback((_req, res) => {
        const wav = silentWav(0.25);
        res.writeHead(200, {
          "content-type": "audio/wav",
          "content-length": String(wav.length),
        });
        res.end(wav);
      });
      try {
        const closed = transcribeDeps(policy());
        const failure = await rejects(() =>
          runTranscribe(
            { audio: `${audio.origin}/clip.wav`, provider: "primary" },
            closed,
          ),
        );
        assert(failure.message.length > 0, "no error on the refused URL");
        assertEqual(
          audio.requests.length,
          0,
          "the audio server was reached under the default policy",
        );
        assertEqual(
          closed.heard.length,
          0,
          "the engine was called for a refused URL",
        );

        const open = transcribeDeps(policy(OPEN_LOOPBACK));
        const result = await runTranscribe(
          { audio: `${audio.origin}/clip.wav`, provider: "primary" },
          open,
        );
        assertEqual(result.text, "hello", "engine answer did not come back");
        assertEqual(
          audio.requests.length,
          1,
          "the audio server was not fetched exactly once",
        );
        assertEqual(
          open.heard.length,
          1,
          "the engine was not called exactly once",
        );
      } finally {
        await audio.close();
      }
    });

    await test("8. transcribe(): the audio download is capped while streaming (policy maxBytes)", async () => {
      const big = await loopback((_req, res) => {
        res.writeHead(200, { "content-type": "audio/wav" });
        // No content-length: the cap has to bite on the stream itself.
        res.end(silentWav(4));
      });
      try {
        const capped = transcribeDeps(
          policy({ ...OPEN_LOOPBACK, maxBytes: 10_000 }),
        );
        const failure = await rejects(() =>
          runTranscribe(
            { audio: `${big.origin}/big.wav`, provider: "primary" },
            capped,
          ),
        );
        assert(
          /size cap|too large|exceeded/i.test(failure.message),
          "cap was not the reason",
        );
        assertEqual(
          capped.heard.length,
          0,
          "the engine saw an over-cap download",
        );
      } finally {
        await big.close();
      }
    });

    await test("9. WebLoader: loopback refused by default, fetched when opened, capped while streaming", async () => {
      const page = await loopback((_req, res) => {
        res.writeHead(200, { "content-type": "text/html" });
        res.end(`<html><body><p>${"x".repeat(50_000)}</p></body></html>`);
      });
      try {
        const loader = new WebLoader();
        const refused = await rejects(() => loader.load(`${page.origin}/`));
        assertEqual(
          refused.code,
          "ATTACHMENT_URL_REFUSED",
          "default policy did not refuse the loopback page",
        );
        assertEqual(
          page.requests.length,
          0,
          "the page server was reached under the default policy",
        );

        const doc = await loader.load(`${page.origin}/`, {
          attachmentPolicy: policy(OPEN_LOOPBACK),
        });
        assert(doc.getContent().length > 1000, "page text was not loaded");
        assertEqual(page.requests.length, 1, "page fetch count");

        const capped = await rejects(() =>
          loader.load(`${page.origin}/`, {
            attachmentPolicy: policy(OPEN_LOOPBACK),
            maxBytes: 1000,
          }),
        );
        assert(
          /size cap|too large|exceeded/i.test(capped.message),
          "cap was not the reason",
        );
      } finally {
        await page.close();
      }
    });

    section("D3 — path loaders honour attachments.allowedRoots");

    const root = scratch("root");
    const outside = scratch("outside");
    const insideFile = join(root, "inside.txt");
    const outsideFile = join(outside, "outside.txt");
    writeFileSync(insideFile, "INSIDE-ROOT-MARKER-7c1e\n");
    writeFileSync(outsideFile, "OUTSIDE-ROOT-MARKER-9a4b\n");
    const linkInside = join(root, "link.txt");
    symlinkSync(outsideFile, linkInside);

    await test("10. generate(): a file outside the roots is refused and the provider is never called", async () => {
      chat.requests.length = 0;
      const nl = new NeuroLink({ attachments: { allowedRoots: [root] } });
      const failure = await rejects(() =>
        nl.generate({
          ...generateOptions,
          input: { text: "read", files: [outsideFile] },
        }),
      );
      assert(failure.message.length > 0, "no error message");
      assertEqual(
        chat.requests.length,
        0,
        "the provider was called after a refused file",
      );
    });

    await test("11. generate(): a file inside the roots is read and reaches the provider", async () => {
      chat.requests.length = 0;
      const nl = new NeuroLink({ attachments: { allowedRoots: [root] } });
      await nl.generate({
        ...generateOptions,
        input: { text: "read", files: [insideFile] },
      });
      assertEqual(chat.requests.length, 1, "provider call count");
      assert(
        chatText(chat).includes("INSIDE-ROOT-MARKER-7c1e"),
        "file content did not reach the provider",
      );
    });

    await test("12. generate(): a symlink inside the roots that points outside is refused", async () => {
      chat.requests.length = 0;
      const nl = new NeuroLink({ attachments: { allowedRoots: [root] } });
      const failure = await rejects(() =>
        nl.generate({
          ...generateOptions,
          input: { text: "read", files: [linkInside] },
        }),
      );
      assert(failure.message.length > 0, "no error message");
      assertEqual(
        chat.requests.length,
        0,
        "the provider was called after a refused symlink",
      );
      assert(
        !chatText(chat).includes("OUTSIDE-ROOT-MARKER-9a4b"),
        "outside content leaked through the symlink",
      );
    });

    await test("13. generate(): an image path outside the roots is refused before the provider", async () => {
      chat.requests.length = 0;
      const outsidePng = join(outside, "pic.png");
      writeFileSync(outsidePng, TINY_PNG);
      const nl = new NeuroLink({ attachments: { allowedRoots: [root] } });
      const failure = await rejects(() =>
        nl.generate({
          ...generateOptions,
          input: { text: "look", images: [outsidePng] },
        }),
      );
      assert(failure.message.length > 0, "no error message");
      assertEqual(
        chat.requests.length,
        0,
        "the provider was called after a refused image path",
      );
    });

    await test("14. transcribe(): an audio path outside the roots is refused; inside is read", async () => {
      const wavInside = join(root, "in.wav");
      const wavOutside = join(outside, "out.wav");
      writeFileSync(wavInside, silentWav(0.25));
      writeFileSync(wavOutside, silentWav(0.25));
      const deps = transcribeDeps(policy({ allowedRoots: [root] }));
      const failure = await rejects(() =>
        runTranscribe({ audio: wavOutside, provider: "primary" }, deps),
      );
      assert(failure.message.length > 0, "no error on the outside path");
      assertEqual(deps.heard.length, 0, "the engine heard a refused file");
      const result = await runTranscribe(
        { audio: wavInside, provider: "primary" },
        deps,
      );
      assertEqual(result.text, "hello", "engine answer did not come back");
      assertEqual(
        deps.heard.length,
        1,
        "the engine was not called exactly once",
      );
    });

    await test("15. rag.files outside the roots are skipped, so a RAG tool with nothing readable fails closed", async () => {
      const failure = await rejects(() =>
        prepareRAGTool(
          { files: [outsideFile] },
          undefined,
          policy({ allowedRoots: [root] }),
        ),
      );
      assert(
        failure.message.includes("No files could be loaded"),
        "RAG did not refuse the outside file",
      );
    });

    await test("16. readAttachmentFile: regular files only, size-capped, roots enforced on the real path", async () => {
      const inside = await readAttachmentFile(insideFile, {
        policy: policy({ allowedRoots: [root] }),
        maxBytes: 1024,
        label: "probe",
      });
      assert(
        inside.buffer.toString("utf8").includes("INSIDE-ROOT-MARKER-7c1e"),
        "inside file not read",
      );
      const viaLink = await rejects(() =>
        readAttachmentFile(linkInside, {
          policy: policy({ allowedRoots: [root] }),
          maxBytes: 1024,
          label: "probe",
        }),
      );
      assertEqual(
        viaLink.code,
        "ATTACHMENT_OUTSIDE_ROOTS",
        "symlink escape not refused",
      );
      const dir = await rejects(() =>
        readAttachmentFile(root, {
          policy: policy(),
          maxBytes: 1024,
          label: "probe",
        }),
      );
      assert(
        dir.code === "ATTACHMENT_NOT_A_FILE" || dir.code === "EISDIR",
        "a directory was accepted",
      );
      const tooBig = await rejects(() =>
        readAttachmentFile(insideFile, {
          policy: policy(),
          maxBytes: 4,
          label: "probe",
        }),
      );
      assertEqual(tooBig.code, "ATTACHMENT_TOO_LARGE", "cap not applied");
      const envRoots = await withEnv(
        { NEUROLINK_ATTACHMENT_ROOTS: root },
        async () =>
          rejects(() =>
            readAttachmentFile(outsideFile, {
              policy: policy(),
              maxBytes: 1024,
              label: "probe",
            }),
          ),
      );
      assertEqual(
        envRoots.code,
        "ATTACHMENT_OUTSIDE_ROOTS",
        "NEUROLINK_ATTACHMENT_ROOTS was not honoured",
      );
    });

    await test("17. reading a path with no roots configured warns once, naming the option", async () => {
      await withEnv({ NEUROLINK_DEBUG: "true" }, async () => {
        resetAttachmentRootsWarning();
        logger.clearLogs();
        await readAttachmentFile(insideFile, {
          policy: policy(),
          maxBytes: 1024,
          label: "probe",
        });
        await readAttachmentFile(insideFile, {
          policy: policy(),
          maxBytes: 1024,
          label: "probe",
        });
        const warnings = logger
          .getLogs("warn")
          .filter((entry) =>
            entry.message.includes("attachments.allowedRoots"),
          );
        assertEqual(
          warnings.length,
          1,
          "the no-roots warning did not fire exactly once",
        );
        assert(
          warnings[0].message.includes("NEUROLINK_ATTACHMENT_ROOTS"),
          "warning does not name the env switch",
        );
      });
    });

    section("D5 / D7 — archives and YAML");

    await test("18. a ZIP with two members named a.txt yields the first member's bytes and a duplicate note", async () => {
      const zip = buildZip([
        { name: "a.txt", data: Buffer.from("FIRST-COPY-5d2f\n") },
        { name: "a.txt", data: Buffer.from("SECOND-COPY-e81c\n") },
        { name: "b.txt", data: Buffer.from("plain b\n") },
      ]);
      const result = await archiveProcessor.processFile({
        id: "dup",
        name: "dup.zip",
        mimetype: "application/zip",
        size: zip.length,
        buffer: zip,
      });
      // adm-zip ≥ 0.6.1 refuses a duplicate name while parsing the central
      // directory; an older build lists both. Either way the SECOND copy must
      // never be what the user is shown as `a.txt`, and the duplicate must be
      // reported rather than silently resolved.
      const text = JSON.stringify(result);
      assert(
        !text.includes("SECOND-COPY-e81c"),
        "the second copy's bytes surfaced",
      );
      assert(
        text.includes("Duplicate entry name"),
        "the duplicate was not reported",
      );
      if (result.success && result.data) {
        const data = result.data;
        assert(
          data.textContent.includes("FIRST-COPY-5d2f"),
          "first copy missing from the extracted text",
        );
        assertEqual(
          data.entries.filter((entry) => entry.name === "a.txt").length,
          1,
          "duplicate listed twice",
        );
      } else {
        assertEqual(
          result.error?.code,
          "CORRUPTED_FILE",
          "unexpected refusal code",
        );
      }
    });

    await test("19. a 30-level YAML alias bomb finishes in under two seconds with asJson omitted", async () => {
      const bomb = Buffer.from(aliasBomb(30));
      const started = Date.now();
      const result = await yamlProcessor.processFile({
        id: "bomb",
        name: "bomb.yaml",
        mimetype: "application/x-yaml",
        size: bomb.length,
        buffer: bomb,
      });
      const elapsed = Date.now() - started;
      assert(elapsed < 2000, `YAML processing took ${elapsed}ms`);
      assert(
        result.success === true && result.data !== undefined,
        "YAML processing failed",
      );
      assertEqual(
        result.data?.valid,
        true,
        "a valid document was reported invalid",
      );
      assertEqual(
        result.data?.asJson,
        null,
        "the expanded document was serialized",
      );
      const small = boundedJsonStringify({ a: [1, 2], b: "x" }, 1000);
      assertEqual(
        small,
        JSON.stringify({ a: [1, 2], b: "x" }, null, 2),
        "bounded serializer differs from JSON.stringify",
      );
      const circular: { self?: unknown } = {};
      circular.self = circular;
      assert(
        boundedJsonStringify(circular, 1000)?.includes("[Circular]") === true,
        "cycle not handled",
      );
    });

    section("D4 / D8 — temp files and ffmpeg argv");

    await test("20. FileReferenceRegistry persists into a 0700 directory as 0600 files and clear() removes it", async () => {
      const registry = new FileReferenceRegistry();
      const ref = await registry.register(
        Buffer.from("x".repeat(50_000)),
        "buffer",
        {
          filename: "big.txt",
        },
      );
      assert(
        typeof ref.tempPath === "string" && ref.tempPath.length > 0,
        "no temp path recorded",
      );
      const tempPath = ref.tempPath as string;
      const dir = join(tempPath, "..");
      assertEqual(statSync(dir).mode & 0o777, 0o700, "temp directory mode");
      assertEqual(statSync(tempPath).mode & 0o777, 0o600, "temp file mode");
      await registry.clear();
      let gone = false;
      try {
        statSync(dir);
      } catch {
        gone = true;
      }
      assert(gone, "clear() left the temp directory behind");
    });

    await test("21. ffmpeg adapter: tracked temp dirs are 0700 and every input argv is hardened", async () => {
      const dir = await createTrackedTempDir("sec-test");
      try {
        assertEqual(statSync(dir).mode & 0o777, 0o700, "tracked temp dir mode");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
      const hardened = withInputHardening(["-y", "-i", "in.mp4", "out.jpg"]);
      assertEqual(hardened[0], "-nostdin", "nostdin not first");
      assert(
        hardened.indexOf("-protocol_whitelist") < hardened.indexOf("-i"),
        "whitelist not before -i",
      );
      assertEqual(
        hardened[hardened.indexOf("-protocol_whitelist") + 1],
        "file,crypto,data",
        "whitelist value",
      );
      assertEqual(
        withInputHardening(["-version"]).join(" "),
        "-version",
        "argv without input was changed",
      );
    });

    await test("22. LocalTempArtifactStore refuses a planted symlink and names the uid in its default directory", async () => {
      const base = scratch("artifacts");
      const victim = join(base, "victim");
      mkdirSync(victim);
      const planted = join(base, "planted");
      symlinkSync(victim, planted);
      const store = new LocalTempArtifactStore(planted);
      const failure = await rejects(() =>
        store.store("payload", {
          toolName: "t",
          serverId: "direct",
          sizeBytes: 7,
          contentType: "text",
        }),
      );
      assert(
        failure.message.includes("refusing"),
        "symlinked directory was accepted",
      );
      const own = new LocalTempArtifactStore(join(base, "own"));
      const ref = await own.store("payload", {
        toolName: "t",
        serverId: "direct",
        sizeBytes: 7,
        contentType: "text",
      });
      assert(ref.id.length > 0, "store into an owned directory failed");
      assertEqual(
        statSync(join(base, "own")).mode & 0o777,
        0o700,
        "artifact dir mode",
      );
      const uid = typeof process.getuid === "function" ? process.getuid() : -1;
      if (uid >= 0) {
        const defaults = new LocalTempArtifactStore();
        assert(
          (defaults as unknown as { dir: string }).dir.endsWith(
            `neurolink-artifacts-${uid}`,
          ),
          "default artifact directory is not per-uid",
        );
      }
      rmSync(base, { recursive: true, force: true });
    });

    section("F5 / F6 / F8 / F9 / F10 — secrets and ids");

    await test("23. Google STT sends the key as x-goog-api-key, not in the URL", async () => {
      const seen: Array<{ url: string; headers: Record<string, string> }> = [];
      const original = globalThis.fetch;
      globalThis.fetch = (async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        const headers: Record<string, string> = {};
        new Headers(init?.headers).forEach((value, key) => {
          headers[key] = value;
        });
        seen.push({ url, headers });
        return new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }) as typeof fetch;
      try {
        const handler = new GoogleSTT("test-google-key-value");
        await handler.transcribe(silentWav(0.25), { format: "wav" });
      } finally {
        globalThis.fetch = original;
      }
      assertEqual(seen.length, 1, "request count");
      assert(!seen[0].url.includes("key="), "the key travelled in the URL");
      assertEqual(
        seen[0].headers["x-goog-api-key"],
        "test-google-key-value",
        "header missing",
      );
    });

    await test("24. logger: debug/info payloads are redacted by key before history and log-event", async () => {
      await withEnv({ NEUROLINK_DEBUG: "true" }, async () => {
        // The default level is "info", so info is the lowest level stored
        // without also changing the level; the same redaction runs for debug.
        logger.clearLogs();
        const events: unknown[] = [];
        logger.setEventEmitter({
          emit: (_name: string, payload: unknown) => {
            events.push(payload);
            return true;
          },
        });
        try {
          logger.info("probe", {
            apiKey: "SECRET-APIKEY-VALUE-31ab",
            nested: {
              authorization: "Bearer SECRET-BEARER-77cd",
              keep: "visible",
            },
            note: "Bearer SECRET-INLINE-aa00",
            list: [{ password: "SECRET-PASSWORD-9e2f" }],
          });
          logger.info("error payload", new Error("boom"));
        } finally {
          logger.setEventEmitter({ emit: () => true });
        }
        const serialized = JSON.stringify(logger.getLogs("info"));
        assert(
          !serialized.includes("SECRET-APIKEY-VALUE-31ab"),
          "apiKey value stored in history",
        );
        assert(
          !serialized.includes("SECRET-BEARER-77cd"),
          "nested authorization stored in history",
        );
        assert(
          !serialized.includes("SECRET-INLINE-aa00"),
          "bearer token in a string value stored in history",
        );
        assert(
          !serialized.includes("SECRET-PASSWORD-9e2f"),
          "password inside an array stored in history",
        );
        assert(
          serialized.includes("visible"),
          "a harmless sibling value was dropped",
        );
        assert(
          !JSON.stringify(events).includes("SECRET-APIKEY-VALUE-31ab"),
          "apiKey value reached a log-event sink",
        );
        const errorEntry = logger
          .getLogs("info")
          .find((entry) => entry.message === "error payload");
        assert(
          errorEntry?.data instanceof Error &&
            errorEntry.data.message === "boom",
          "an Error payload lost its message",
        );
      });
    });

    await test("25. .env writes are owner-only (0600) including the backup", async () => {
      const dir = scratch("env");
      const envPath = join(dir, ".env");
      writeFileSync(envPath, "EXISTING=1\n", { mode: 0o644 });
      updateEnvFile({ NEW_KEY: "value" }, envPath, true);
      assertEqual(statSync(envPath).mode & 0o777, 0o600, ".env mode");
      const entries = readFileSync(envPath, "utf8");
      assert(entries.includes("NEW_KEY=value"), ".env was not updated");
      const backups = readdirSync(dir).filter((name) =>
        name.startsWith(".env.backup."),
      );
      assertEqual(backups.length, 1, "backup count");
      assertEqual(
        statSync(join(dir, backups[0])).mode & 0o777,
        0o600,
        "backup mode",
      );
      rmSync(dir, { recursive: true, force: true });
    });

    await test("26. Redis ids with ':' '*' '?' '[' or a line break are refused; the legacy switch downgrades to a warning", async () => {
      const bad = ["a:*", "a*", "b?", "c[", "d\ne", ""];
      for (const id of bad) {
        const failure = await rejects(async () =>
          assertSafeRedisId(id, "sessionId"),
        );
        assertEqual(
          failure.code,
          "INVALID_REDIS_ID",
          `an unsafe id of length ${id.length} was accepted`,
        );
      }
      assertSafeRedisId("session-abc_123.x", "sessionId");
      const config = {
        keyPrefix: "nl:",
        userSessionsKeyPrefix: "nl:user:",
      } as unknown as Parameters<typeof getSessionKey>[0];
      const viaKey = await rejects(async () =>
        getSessionKey(config, "a:*", "user"),
      );
      assertEqual(
        viaKey.code,
        "INVALID_REDIS_ID",
        "getSessionKey built a key from an unsafe id",
      );
      await withEnv({ NEUROLINK_REDIS_ALLOW_LEGACY_IDS: "1" }, async () => {
        const key = getSessionKey(config, "legacy:id", "user");
        assert(
          key.endsWith("legacy:id"),
          "legacy switch did not pass the id through",
        );
      });
    });

    await test("27. skill and task ids that are not file names are refused before any path join", async () => {
      for (const id of [
        "../evil",
        "a/b",
        ".hidden",
        "",
        "x".repeat(200),
        "a\\b",
      ]) {
        const failure = await rejects(async () => assertSafeStoreId(id, "id"));
        assertEqual(
          failure.code,
          "INVALID_STORE_ID",
          `an unsafe id of length ${id.length} was accepted`,
        );
      }
      assertSafeStoreId("my.skill_v1-2", "id");
      const skills = new FileSystemSkillStore(scratch("skills"));
      const failure = await rejects(() => skills.delete("../../outside"));
      assertEqual(
        failure.code,
        "INVALID_STORE_ID",
        "a traversal skill id reached the file system",
      );
    });

    await test("28. logger: app-named *Token keys, bare JWTs and phone numbers are redacted; token counts stay", async () => {
      // Assembled at runtime so the file holds no JWT literal for gitleaks.
      const jwt = [
        "eyJhbGciOiJIUzI1NiJ9",
        "eyJzdWIiOiJwcm9iZSJ9",
        "c2lnbmF0dXJlLTI4",
      ].join(".");
      const options = {
        context: {
          breezeToken: jwt,
          juspayToken: "placeholder-juspay-28aa",
          currentTokenData: {
            breezeToken: jwt,
            platformToken: "placeholder-platform-28bb",
          },
          phoneNumber: "+910000028cc",
          customerId: "cust-visible-28",
        },
        note: `forwarded ${jwt} upstream`,
        costPerToken: 0.000125,
        maxTokens: 4096,
        hasRefreshToken: true,
      };
      await withEnv({ NEUROLINK_DEBUG: "true" }, async () => {
        logger.clearLogs();
        const events: unknown[] = [];
        logger.setEventEmitter({
          emit: (_name: string, payload: unknown) => {
            events.push(payload);
            return true;
          },
        });
        try {
          logger.info("structured", options);
          // The options dumps in conversationMemory.ts and neurolink.ts
          // serialize before logging, so their keys are masked by sanitizeRecord.
          logger.info("serialized", {
            options: safeDebugSerialize(sanitizeRecord(options)),
          });
          logger.info(`session ${jwt}`);
          logger.info({ breezeToken: "placeholder-message-28dd" });
          logger.info(
            JSON.stringify({
              juspayToken: "placeholder-json-28ee",
              costPerToken: 0.5,
            }),
          );
          logger.info("GET /orders?pageToken=placeholder-url-28ff");
        } finally {
          logger.setEventEmitter({ emit: () => true });
        }
        const serialized = JSON.stringify([logger.getLogs("info"), events]);
        for (const [secret, what] of [
          ["eyJhbGciOiJIUzI1NiJ9", "a JWT"],
          ["placeholder-juspay-28aa", "an opaque *Token value"],
          ["placeholder-platform-28bb", "a nested *Token value"],
          ["+910000028cc", "a phone number"],
          ["placeholder-message-28dd", "a *Token key in an object message"],
          ["placeholder-json-28ee", "a *Token key in a serialized message"],
          ["placeholder-url-28ff", "a *Token query parameter in a message"],
        ]) {
          assert(
            !serialized.includes(secret),
            `${what} reached history or a log-event sink`,
          );
        }
        const dataOf = (message: string): Record<string, unknown> => {
          const data = logger
            .getLogs("info")
            .find((entry) => entry.message === message)?.data;
          return isRecord(data) ? data : {};
        };
        const structured = dataOf("structured");
        assert(
          structured.costPerToken === 0.000125 &&
            structured.maxTokens === 4096 &&
            structured.hasRefreshToken === true,
          "a numeric or boolean *Token field was masked",
        );
        const dump = String(dataOf("serialized").options);
        assert(
          dump.includes('"costPerToken":0.000125') &&
            dump.includes('"maxTokens":4096') &&
            dump.includes("cust-visible-28"),
          "the serialized dump lost a harmless field",
        );
        const jsonMessage =
          logger
            .getLogs("info")
            .find((entry) => entry.message.includes("costPerToken"))?.message ??
          "";
        assert(
          jsonMessage.includes('"juspayToken":"***"') &&
            jsonMessage.includes('"costPerToken":0.5'),
          "a serialized message lost its key name or its token count",
        );
      });
    });

    await test("29. sanitizeRecord: a megabyte of near-miss JWT text is redacted in linear time", () => {
      const started = Date.now();
      sanitizeRecord({ note: "eyJ-".repeat(250_000) }, 1_000_000);
      const elapsed = Date.now() - started;
      assert(
        elapsed < 2000,
        `redacting took ${elapsed} ms; the JWT pattern rescans each eyJ`,
      );
    });

    await test("30. logger: Map, Set, URL and class-instance data are redacted; a shared object once; cycles and deep nesting never throw", async () => {
      class Client {
        juspayToken = "placeholder-class-30aa";
        region = "ap-south-1";
      }
      const shared = { breezeToken: "placeholder-shared-30ff" };
      const cyclic: Record<string, unknown> = { name: "cyclic-30" };
      cyclic.self = cyclic;
      let deep: Record<string, unknown> = { leaf: "placeholder-deep-30dd" };
      for (let i = 0; i < 100_000; i++) {
        deep = { next: deep };
      }
      await withEnv({ NEUROLINK_DEBUG: "true" }, async () => {
        logger.clearLogs();
        const events: unknown[] = [];
        logger.setEventEmitter({
          emit: (_name: string, payload: unknown) => {
            events.push(payload);
            return true;
          },
        });
        try {
          logger.info("containers", {
            map: new Map([["breezeToken", "placeholder-map-30bb"]]),
            set: new Set(["pageToken=placeholder-set-30ee"]),
            client: new Client(),
            url: new URL("https://example.test/cb?token=placeholder-url-30cc"),
            cyclic,
            pair: { a: shared, b: shared },
          });
          logger.info("deep", deep);
        } finally {
          logger.setEventEmitter({ emit: () => true });
        }
        const checkRedacted = (where: string, data: unknown): void => {
          const {
            map,
            set,
            client,
            url,
            cyclic: cycle,
            pair,
          } = isRecord(data) ? data : {};
          assert(
            map instanceof Map && map.get("breezeToken") === "***",
            `a Map's *Token entry reached ${where} unmasked`,
          );
          assert(
            set instanceof Set &&
              !Array.from(set, String).some((v) =>
                v.includes("placeholder-set-30ee"),
              ),
            `a Set's token value reached ${where} unmasked`,
          );
          assert(
            isRecord(client) &&
              client.juspayToken === "***" &&
              client.region === "ap-south-1",
            `a class instance's fields were not redacted in ${where}`,
          );
          assert(
            typeof url === "string" &&
              url.includes("example.test") &&
              !url.includes("placeholder-url-30cc"),
            `a URL's token query parameter reached ${where}`,
          );
          assert(
            isRecord(cycle) && cycle.self === "[Circular]",
            `a circular reference was not cut in ${where}`,
          );
          assert(
            isRecord(pair) &&
              isRecord(pair.a) &&
              pair.a === pair.b &&
              pair.a.breezeToken === "***",
            `a shared object was not redacted once and shared in ${where}`,
          );
        };
        checkRedacted(
          "history",
          logger.getLogs("info").find((entry) => entry.message === "containers")
            ?.data,
        );
        const emitted = events.find(
          (event) => isRecord(event) && event.message === "containers",
        );
        checkRedacted(
          "a log-event sink",
          isRecord(emitted) ? emitted.data : undefined,
        );
        const deepEntry = logger
          .getLogs("info")
          .find((entry) => entry.message === "deep");
        assert(
          deepEntry?.data === "[unredactable log data]",
          "a too-deep payload was stored instead of being dropped",
        );
      });
    });

    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  } finally {
    await images.close();
    await chat.close();
  }
});
