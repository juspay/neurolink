#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability, proxy and voice
 *
 * Determinism exception (CLAUDE.md rule 15). The proxy engines and the LiveKit
 * realtime wiring are reachable only through a running proxy / worker, and what
 * is asserted here is the exact set of Langfuse attributes they put on the wire:
 * identity on every record, request and response bodies, usage and cost on the
 * generation, one trace per realtime turn, tool records paired per call. A live
 * provider cannot be made to return a fixed usage, an overlapping pair of
 * same-name tool calls, a stalled Langfuse endpoint or a worker that is reaped
 * a second after shutdown. So the suite drives the REAL proxy routes
 * (`createProxyStartApp`) and the REAL `setUpRealtimeCallMemory` from `src/`
 * against local stand-ins: recorded Anthropic / Codex replies behind a stubbed
 * `fetch`, a local OpenAI-compatible server for the translated path, and a local
 * Langfuse OTLP receiver that decodes what NeuroLink's own exporter posts
 * (masking and `redactIO` included). Everything is imported from `src/`; nothing
 * is imported from `dist`.
 *
 * Every check prints exactly one `PROOF <finding> PASS|FAIL <description>` line
 * and the process exits non-zero if any check failed. No keys, no live calls.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-observability-proxy-voice.ts
 */
import "./helpers/credentialFreeEnv.js";
import "./helpers/proxyTestIsolation.js";
import type { JsonValue } from "../src/lib/types/common.js";
import { spawnSync } from "node:child_process";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

type Attr = string | number | boolean;
type SeenSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  attrs: Record<string, Attr>;
  events: Array<{ name: string; attrs: Record<string, Attr> }>;
};
type OtlpValue = {
  stringValue?: string;
  intValue?: string;
  doubleValue?: number;
  boolValue?: boolean;
  arrayValue?: { values?: OtlpValue[] };
};
type OtlpKeyValue = { key: string; value: OtlpValue };
type OtlpSpanJson = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  attributes?: OtlpKeyValue[];
  events?: Array<{ name: string; attributes?: OtlpKeyValue[] }>;
};

// ---------------------------------------------------------------------------
// PROOF reporting
// ---------------------------------------------------------------------------

let failures = 0;

/** Runs one check and prints its single machine-readable line. */
async function check(
  id: string,
  description: string,
  run: () => void | Promise<void>,
): Promise<void> {
  try {
    await run();
    console.log(`PROOF ${id} PASS ${description}`);
  } catch (error) {
    failures += 1;
    console.log(`PROOF ${id} FAIL ${description}`);
    console.log(
      `  reason: ${error instanceof Error ? error.message : "non-error thrown"}`,
    );
  }
}

function expect(condition: unknown, reason: string): asserts condition {
  if (!condition) {
    throw new Error(reason);
  }
}

const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Local Langfuse OTLP receiver
// ---------------------------------------------------------------------------

function decodeValue(value: OtlpValue): Attr | undefined {
  if (value.stringValue !== undefined) {
    return value.stringValue;
  }
  if (value.intValue !== undefined) {
    return Number(value.intValue);
  }
  if (value.doubleValue !== undefined) {
    return value.doubleValue;
  }
  if (value.boolValue !== undefined) {
    return value.boolValue;
  }
  if (value.arrayValue !== undefined) {
    return JSON.stringify((value.arrayValue.values ?? []).map(decodeValue));
  }
  return undefined;
}

function decodeAttributes(list: OtlpKeyValue[] = []): Record<string, Attr> {
  const out: Record<string, Attr> = {};
  for (const { key, value } of list) {
    const decoded = decodeValue(value);
    if (decoded !== undefined) {
      out[key] = decoded;
    }
  }
  return out;
}

type Ingest = {
  url: string;
  seen: SeenSpan[];
  requests: () => number;
  reset: () => void;
  stall: (ms: number) => void;
  /** Answers every request that is being held back by `stall`. */
  release: () => void;
  close: () => Promise<void>;
};

async function startIngest(): Promise<Ingest> {
  const seen: SeenSpan[] = [];
  const held = new Set<ServerResponse>();
  let stallMs = 0;
  let requests = 0;
  const server: Server = createServer((req: IncomingMessage, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      requests += 1;
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
          resourceSpans?: Array<{
            scopeSpans?: Array<{ spans?: OtlpSpanJson[] }>;
          }>;
        };
        for (const resource of body.resourceSpans ?? []) {
          for (const scope of resource.scopeSpans ?? []) {
            for (const span of scope.spans ?? []) {
              seen.push({
                traceId: span.traceId,
                spanId: span.spanId,
                parentSpanId: span.parentSpanId,
                name: span.name,
                attrs: decodeAttributes(span.attributes),
                events: (span.events ?? []).map((event) => ({
                  name: event.name,
                  attrs: decodeAttributes(event.attributes),
                })),
              });
            }
          }
        }
      } catch {
        // A malformed post is simply not recorded.
      }
      const answer = () => {
        held.delete(res);
        if (!res.writableEnded) {
          res.writeHead(200, { "content-type": "application/json" });
          res.end("{}");
        }
      };
      if (stallMs > 0) {
        held.add(res);
        setTimeout(answer, stallMs).unref();
      } else {
        answer();
      }
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}`,
    seen,
    requests: () => requests,
    reset: () => {
      seen.length = 0;
    },
    stall: (ms) => {
      stallMs = ms;
    },
    release: () => {
      for (const res of held) {
        held.delete(res);
        if (!res.writableEnded) {
          res.writeHead(200, { "content-type": "application/json" });
          res.end("{}");
        }
      }
    },
    close: () =>
      new Promise<void>((resolve) => {
        for (const res of held) {
          res.end("{}");
        }
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

// ---------------------------------------------------------------------------
// Bootstrap: environment first, then everything from src via dynamic import
// ---------------------------------------------------------------------------

const ingest = await startIngest();
process.env.LANGFUSE_PUBLIC_KEY = "pk-proof";
process.env.LANGFUSE_SECRET_KEY = "sk-proof";
process.env.LANGFUSE_BASE_URL = ingest.url;
process.env.NEUROLINK_SKIP_MCP = "true";
// PROOF_KEEP_BODY_FLAG lets the red-proof run show a defect that survives the
// explicit opt-in flag; a normal run starts from an unset environment.
if (!process.env.PROOF_KEEP_BODY_FLAG) {
  delete process.env.NEUROLINK_PROXY_TRACE_BODY_LOGGING;
}
delete process.env.NEUROLINK_RECORD_INPUTS;

const KEEP = "KEEP";
const MASK = "MASKME";

/** Masks every MASKME-* token; leaves KEEP-* tokens readable. */
function maskSecrets({ data }: { data: JsonValue }): JsonValue {
  return JSON.parse(
    JSON.stringify(data).replace(/MASKME-[A-Z0-9-]+/g, "[masked]"),
  );
}

const { ensureTelemetry, flushOpenTelemetry, getLangfuseHealthStatus } =
  await import("../src/lib/services/server/ai/observability/instrumentation.js");
ensureTelemetry({
  langfuse: {
    publicKey: "pk-proof",
    secretKey: "sk-proof",
    baseUrl: ingest.url,
    mask: maskSecrets,
    // Batched like production: nothing is delivered until a flush or 100 spans.
    flushAt: 100,
    flushInterval: 600,
  },
});

const { getExporterRegistry } =
  await import("../src/lib/observability/exporterRegistry.js");
const { LangfuseExporter } =
  await import("../src/lib/observability/exporters/langfuseExporter.js");
const { createProxyStartApp } = await import("../src/cli/commands/proxy.js");
const { getProxyActivitySnapshot } =
  await import("../src/lib/proxy/proxyActivity.js");
const { tokenStore } = await import("../src/lib/auth/tokenStore.js");
const { initRequestLogger, flushRequestLogs } =
  await import("../src/lib/proxy/requestLogger.js");
const { flushProxyLifecycleEvents } =
  await import("../src/lib/proxy/proxyLifecycle.js");
const { NeuroLink } = await import("../src/lib/neurolink.js");
const realtimeMemoryModule =
  await import("../src/lib/voice/livekit/realtimeMemory.js");
const { setUpRealtimeCallMemory } = realtimeMemoryModule;
type VoiceRecorder = NonNullable<
  Awaited<ReturnType<typeof setUpRealtimeCallMemory>>
>["recorder"];
const { signVoiceMemoryBinding } =
  await import("../src/lib/voice/livekit/memoryBinding.js");
initRequestLogger(false);

expect(
  getLangfuseHealthStatus().isHealthy,
  "Langfuse exporter did not start for the proof run",
);

/** Pushes buffered spans to the receiver and waits until `ready` holds. */
async function settle(ready: () => boolean = () => true): Promise<void> {
  const deadline = Date.now() + 8_000;
  do {
    await flushOpenTelemetry();
    if (ready()) {
      return;
    }
    await pause(25);
  } while (Date.now() < deadline);
  throw new Error("expected spans did not reach the Langfuse receiver");
}

const bySession = (session: string) =>
  ingest.seen.filter((s) => s.attrs["session.id"] === session);
const traceOf = (traceId: string) =>
  ingest.seen.filter((s) => s.traceId === traceId);
const observationType = (s: SeenSpan) =>
  String(s.attrs["langfuse.observation.type"] ?? "");
const generationsOf = (spans: SeenSpan[]) =>
  spans.filter((s) => observationType(s) === "generation");
const text = (s: SeenSpan | undefined, key: string): string =>
  s === undefined ? "" : String(s.attrs[key] ?? "");
const inputOf = (s: SeenSpan | undefined) =>
  text(s, "langfuse.observation.input");
const outputOf = (s: SeenSpan | undefined) =>
  text(s, "langfuse.observation.output");
const hasContent = (s: SeenSpan | undefined) =>
  inputOf(s) !== "" || outputOf(s) !== "";

function numbers(s: SeenSpan | undefined, key: string): Record<string, number> {
  const raw = text(s, key);
  if (raw === "") {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Proxy fixtures: real routes, recorded upstream replies
// ---------------------------------------------------------------------------

const CLAUDE_MODEL = "claude-sonnet-4-6";
const CODEX_MODEL = "gpt-5.1-codex";

type Who = { user: string; session: string; conversation: string };

function claudeStreamBody(answer: string): string {
  const frame = (event: string, data: object) =>
    `event: ${event}\ndata: ${JSON.stringify({ type: event, ...data })}\n\n`;
  return (
    frame("message_start", {
      message: {
        id: "msg_proof",
        type: "message",
        role: "assistant",
        model: CLAUDE_MODEL,
        content: [],
        usage: {
          input_tokens: 120,
          output_tokens: 0,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
        },
      },
    }) +
    frame("content_block_start", {
      index: 0,
      content_block: { type: "text", text: "" },
    }) +
    frame("content_block_delta", {
      index: 0,
      delta: { type: "text_delta", text: answer },
    }) +
    frame("content_block_stop", { index: 0 }) +
    frame("message_delta", {
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: 30 },
    }) +
    frame("message_stop", {})
  );
}

function claudeJsonBody(answer: string): string {
  return JSON.stringify({
    id: "msg_proof",
    type: "message",
    role: "assistant",
    model: CLAUDE_MODEL,
    content: [{ type: "text", text: answer }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 120,
      output_tokens: 30,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
  });
}

function codexStreamBody(answer: string): string {
  const frame = (event: string, data: object) =>
    `event: ${event}\ndata: ${JSON.stringify({ type: event, ...data })}\n\n`;
  return frame("response.completed", {
    response: {
      id: "resp_proof",
      model: CODEX_MODEL,
      status: "completed",
      output: [
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: answer }],
        },
      ],
      usage: {
        input_tokens: 100,
        output_tokens: 20,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens_details: { reasoning_tokens: 0 },
      },
    },
  });
}

type FixtureKind =
  | "claude-json"
  | "claude-stream"
  | "codex"
  | "translated"
  | "fallback";

type Fixture = {
  kind: FixtureKind;
  who: Who;
  /** Text the client sends, with one readable and one masked token. */
  request: string;
  /** Text the upstream answers with, with one readable and one masked token. */
  answer: string;
};

let sequence = 0;
function fixture(kind: FixtureKind): Fixture {
  sequence += 1;
  const tag = `${kind}-${sequence}`.toUpperCase();
  return {
    kind,
    who: {
      user: `user-${kind}-${sequence}`,
      session: `session-${kind}-${sequence}`,
      conversation: `conversation-${kind}-${sequence}`,
    },
    request: `${KEEP}-REQ-${tag} ${MASK}-REQ-${tag}`,
    answer: `${KEEP}-RESP-${tag} ${MASK}-RESP-${tag}`,
  };
}

const delegate = globalThis.fetch;

async function withProxy(
  f: Fixture,
  extra: {
    neurolink?: InstanceType<typeof NeuroLink>;
    headers?: Record<string, string>;
  },
  run: (response: Response) => Promise<void>,
): Promise<void> {
  const accountKey =
    f.kind === "codex"
      ? "codex:proof@example.test"
      : "anthropic:proof@example.test";
  await tokenStore.saveTokens(accountKey, {
    accessToken: "isolated-fixture",
    tokenType: "Bearer",
    expiresAt: Date.now() + 3_600_000,
  });
  globalThis.fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (
      url.hostname === "api.anthropic.com" &&
      url.pathname.endsWith("/messages")
    ) {
      if (f.kind === "fallback") {
        return new Response(
          JSON.stringify({
            type: "error",
            error: { type: "api_error", message: "upstream failed" },
          }),
          { status: 500, headers: { "content-type": "application/json" } },
        );
      }
      return f.kind === "claude-stream"
        ? new Response(claudeStreamBody(f.answer), {
            headers: { "content-type": "text/event-stream" },
          })
        : new Response(claudeJsonBody(f.answer), {
            headers: { "content-type": "application/json" },
          });
    }
    if (url.hostname === "chatgpt.com" && url.pathname.endsWith("/responses")) {
      return new Response(codexStreamBody(f.answer), {
        headers: { "content-type": "text/event-stream" },
      });
    }
    return delegate(input, init);
  };
  try {
    const translated = f.kind === "translated";
    const { app } = await createProxyStartApp({
      neurolink: (extra.neurolink ?? {
        getToolRegistry: () => ({}),
      }) as Parameters<typeof createProxyStartApp>[0]["neurolink"],
      modelRouter: translated
        ? {
            resolve: () => ({ provider: "openai", model: "gpt-4o-mini" }),
            isClaudeTarget: () => false,
            getFallbackChain: () => [],
          }
        : f.kind === "fallback"
          ? {
              resolve: () => ({ provider: "anthropic", model: CLAUDE_MODEL }),
              isClaudeTarget: () => true,
              getFallbackChain: () => [
                { provider: "openai", model: "gpt-4o-mini" },
              ],
            }
          : undefined,
      strategy: "fill-first",
      passthrough: false,
      port: 0,
      host: "127.0.0.1",
      proxyConfig: null,
      primaryAccountKey: undefined,
      accountAllowlist: new Set([accountKey]),
    });
    const isCodex = f.kind === "codex";
    const body = isCodex
      ? {
          model: CODEX_MODEL,
          stream: true,
          input: [
            {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: f.request }],
            },
          ],
        }
      : {
          model: CLAUDE_MODEL,
          stream: f.kind !== "claude-json",
          max_tokens: 128,
          messages: [{ role: "user", content: f.request }],
        };
    const response = await app.request(
      `http://localhost${isCodex ? "/backend-api/codex/responses" : "/v1/messages"}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-neurolink-user-id": f.who.user,
          "x-neurolink-session-id": f.who.session,
          "x-neurolink-conversation-id": f.who.conversation,
          ...extra.headers,
        },
        body: JSON.stringify(body),
      },
    );
    await run(response);
    const deadline = Date.now() + 4_000;
    while (
      getProxyActivitySnapshot().activeRequests > 0 &&
      Date.now() < deadline
    ) {
      await pause(5);
    }
    await flushRequestLogs();
    await flushProxyLifecycleEvents();
  } finally {
    globalThis.fetch = delegate;
    await tokenStore.clearTokens(accountKey);
  }
}

type Observed = { f: Fixture; spans: SeenSpan[] };

/** Sends one request through the real route and returns its trace's spans. */
async function exercise(
  f: Fixture,
  extra: Parameters<typeof withProxy>[1] = {},
): Promise<Observed> {
  ingest.reset();
  let status = 0;
  await withProxy(f, extra, async (response) => {
    status = response.status;
    const answered = await response.text();
    if (process.env.PROOF_DEBUG) {
      console.error(`status ${status}: ${answered.slice(0, 400)}`);
    }
  });
  expect(status === 200, "the proxy did not answer the fixture request");
  await settle(() =>
    bySession(f.who.session).some((s) => s.name === "proxy.request"),
  );
  const root = bySession(f.who.session).find((s) => s.name === "proxy.request");
  expect(root !== undefined, "no proxy.request record reached Langfuse");
  // A translated request may record its generation outside the proxy's trace;
  // that is exactly what the checks look at, so keep everything received.
  await settle(() => generationsOf(ingest.seen).length > 0);
  const spans =
    f.kind === "translated" || f.kind === "fallback"
      ? [...ingest.seen]
      : traceOf(root.traceId);
  if (process.env.PROOF_DEBUG) {
    console.error(JSON.stringify(spans, null, 1));
  }
  return { f, spans };
}

const rootOf = (spans: SeenSpan[]) =>
  spans.find((s) => s.name === "proxy.request");

// ---------------------------------------------------------------------------
// Translated path: a real NeuroLink against a local OpenAI-compatible server
// ---------------------------------------------------------------------------

async function startOpenAI(): Promise<{
  baseURL: string;
  close: () => Promise<void>;
}> {
  const frame = (delta: object, finish: string | null) =>
    `data: ${JSON.stringify({
      id: "chatcmpl-proof",
      object: "chat.completion.chunk",
      created: 1,
      model: "gpt-4o-mini",
      choices: [{ index: 0, delta, finish_reason: finish }],
    })}\n\n`;
  const server = createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(frame({ role: "assistant", content: "translated " }, null));
      res.write(frame({ content: "answer" }, null));
      res.write(frame({}, "stop"));
      res.write(
        `data: ${JSON.stringify({
          id: "chatcmpl-proof",
          object: "chat.completion.chunk",
          created: 1,
          model: "gpt-4o-mini",
          choices: [],
          usage: { prompt_tokens: 40, completion_tokens: 8, total_tokens: 48 },
        })}\n\n`,
      );
      res.end("data: [DONE]\n\n");
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

// ---------------------------------------------------------------------------
// Realtime voice fixtures: the real wiring helper with a fake conversation store
// ---------------------------------------------------------------------------

const VOICE_SECRET = "proof-secret-with-more-than-sixteen-chars";
let voiceSequence = 0;

type VoiceCall = {
  ctx: Parameters<typeof setUpRealtimeCallMemory>[0];
  callbacks: Array<() => Promise<void>>;
  room: string;
  user: string;
  session: string;
  metadata: string;
};

function voiceCall(bound = true): VoiceCall {
  voiceSequence += 1;
  const room = `proof-room-${voiceSequence}`;
  const user = `voice-user-${voiceSequence}`;
  const session = `voice-session-${voiceSequence}`;
  const binding = signVoiceMemoryBinding({
    room,
    userId: user,
    sessionId: session,
    secret: VOICE_SECRET,
  });
  const metadata = Buffer.from(
    JSON.stringify({
      authToken: "t",
      mcpContext: {},
      ...(bound ? { memory: binding } : {}),
    }),
  ).toString("base64");
  const callbacks: Array<() => Promise<void>> = [];
  const ctx = {
    room: { name: room, metadata },
    addShutdownCallback: (callback: () => Promise<void>) => {
      callbacks.push(callback);
    },
  } as unknown as Parameters<typeof setUpRealtimeCallMemory>[0];
  return { ctx, callbacks, room, user, session, metadata };
}

function fakeStore(failFirst = 0) {
  const stored: string[] = [];
  let attempts = 0;
  return {
    stored,
    attempts: () => attempts,
    config: {
      secret: VOICE_SECRET,
      seed: false as const,
      createNeuroLink: async () => ({
        recordConversationTurn: async (options: { turnId?: string }) => {
          attempts += 1;
          if (attempts <= failFirst) {
            throw new Error("store unavailable");
          }
          stored.push(String(options.turnId));
          return { recorded: true, sessionId: "s", userId: "u" };
        },
        getConversationSeed: async () => [],
      }),
    },
  };
}

const realtimeTurns = (session: string) =>
  ingest.seen.filter(
    (s) => s.name === "realtime-turn" && s.attrs["session.id"] === session,
  );

// ---------------------------------------------------------------------------
// Probe: the tracer's raw body events in a fresh process per environment
// ---------------------------------------------------------------------------

function probeRawBodyEvents(env: Record<string, string>): {
  eventCount: number;
  bodies: string[];
} {
  const script = `
    const { InMemorySpanExporter, SimpleSpanProcessor } = await import("@opentelemetry/sdk-trace-base");
    const { NodeTracerProvider } = await import("@opentelemetry/sdk-trace-node");
    const exporter = new InMemorySpanExporter();
    new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] }).register();
    const { ProxyTracer } = await import(${JSON.stringify(new URL("../src/lib/proxy/proxyTracer.ts", import.meta.url).href)});
    const tracer = ProxyTracer.startRequest({ requestId: "probe", method: "POST", path: "/v1/messages", model: "m", stream: false, toolCount: 0 }, {});
    tracer.logRequestBody(JSON.stringify({ prompt: "readable", api_key: "hunter2" }));
    tracer.end(200, 1);
    const root = exporter.getFinishedSpans().find((s) => s.name === "proxy.request");
    const events = (root?.events ?? []).filter((e) => e.name === "proxy.client.request_body");
    console.log(JSON.stringify({ eventCount: events.length, bodies: events.map((e) => String(e.attributes?.["proxy.body"] ?? "")) }));
  `;
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", script],
    {
      env: { ...process.env, ...env },
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      encoding: "utf8",
    },
  );
  const line = run.stdout
    .trim()
    .split("\n")
    .reverse()
    .find((l) => l.startsWith("{"));
  expect(line !== undefined, "the tracer probe produced no result");
  return JSON.parse(line) as { eventCount: number; bodies: string[] };
}

// ---------------------------------------------------------------------------
// Scenarios. Each runs once; several findings read the same records.
// ---------------------------------------------------------------------------

type Outcome = { ok: true; value: Observed } | { ok: false; reason: string };

async function attempt(run: () => Promise<Observed>): Promise<Outcome> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "scenario failed",
    };
  }
}

function seenIn(outcome: Outcome): Observed {
  if (!outcome.ok) {
    throw new Error(outcome.reason);
  }
  return outcome.value;
}

// Bodies are opt-in (maintainer decision on K17): the scenarios below read the
// recorded request and response, so they run with the explicit flag.
process.env.NEUROLINK_PROXY_TRACE_BODY_LOGGING = "true";
const claudeJson = await attempt(() => exercise(fixture("claude-json")));
const claudeStream = await attempt(() => exercise(fixture("claude-stream")));
const codex = await attempt(() => exercise(fixture("codex")));
delete process.env.NEUROLINK_PROXY_TRACE_BODY_LOGGING;

const openai = await startOpenAI();
const translatedNeuroLink = new NeuroLink({
  credentials: { openai: { apiKey: "proof-key", baseURL: openai.baseURL } },
});
const translated = await attempt(() =>
  exercise(fixture("translated"), { neurolink: translatedNeuroLink }),
);

// The fallback leg resolves its provider from the environment, not the instance.
const fallbackEnv = {
  OPENAI_API_KEY: `sk-${"p".repeat(48)}`,
  OPENAI_BASE_URL: openai.baseURL,
};
const priorEnv = Object.fromEntries(
  Object.keys(fallbackEnv).map((key) => [key, process.env[key]]),
);
Object.assign(process.env, fallbackEnv);
const fallback = await attempt(() =>
  exercise(fixture("fallback"), { neurolink: translatedNeuroLink }),
);
for (const [key, value] of Object.entries(priorEnv)) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

const generationOf = (spans: SeenSpan[]) => generationsOf(spans)[0];

/** Records of a trace that lack the request's user or session. */
function withoutIdentity(spans: SeenSpan[], who: Who): string[] {
  return spans
    .filter(
      (s) =>
        observationType(s) !== "" &&
        (s.attrs["user.id"] !== who.user ||
          s.attrs["session.id"] !== who.session),
    )
    .map((s) => s.name);
}

function ancestors(spans: SeenSpan[], start: SeenSpan): string[] {
  const byId = new Map(spans.map((s) => [s.spanId, s]));
  const chain: string[] = [];
  let current: SeenSpan | undefined = start;
  while (current?.parentSpanId) {
    chain.push(current.parentSpanId);
    current = byId.get(current.parentSpanId);
  }
  return chain;
}

// ---- K08: translated requests --------------------------------------------

await check(
  "K08",
  "translated request: the NeuroLink generation carries the request's user and session",
  () => {
    const { f, spans } = seenIn(translated);
    const generations = generationsOf(spans);
    expect(generations.length > 0, "no generation record in the trace");
    const missing = withoutIdentity(generations, f.who);
    expect(missing.length === 0, "a generation record lacks user or session");
  },
);

await check(
  "K08",
  "translated request: the generation sits under the proxy.request root of the same trace",
  () => {
    const { spans } = seenIn(translated);
    const root = rootOf(spans);
    expect(root !== undefined, "no proxy.request root");
    const generation = generationOf(spans);
    expect(generation !== undefined, "no generation record");
    expect(
      ancestors(spans, generation).includes(root.spanId),
      "the generation is not linked to the proxy root",
    );
  },
);

await check(
  "K08",
  "translated request: exactly one generation holds usage and cost",
  () => {
    const { spans } = seenIn(translated);
    const generations = generationsOf(spans);
    expect(generations.length === 1, "the trace does not hold one generation");
    const usage = numbers(generations[0], "langfuse.observation.usage_details");
    expect(usage.input === 40 && usage.output === 8, "usage is wrong");
    const cost = numbers(generations[0], "langfuse.observation.cost_details");
    expect((cost.total ?? 0) > 0, "no cost on the generation");
  },
);

await check(
  "K08",
  "translated fallback after failed Claude attempts: exactly one generation holds usage and cost",
  () => {
    const { f, spans } = seenIn(fallback);
    const generations = generationsOf(spans);
    expect(generations.length === 1, "the trace does not hold one generation");
    expect(
      withoutIdentity(generations, f.who).length === 0,
      "the generation lacks user or session",
    );
    const usage = numbers(generations[0], "langfuse.observation.usage_details");
    expect(usage.input === 40 && usage.output === 8, "usage is wrong");
  },
);

// ---- K16 / K17 / K19 / K40: native Claude and Codex ----------------------

for (const [label, outcome] of [
  ["Claude JSON", claudeJson],
  ["Claude stream", claudeStream],
] as const) {
  await check(
    "K19",
    `${label}: root and generation carry the request's user and session`,
    () => {
      const { f, spans } = seenIn(outcome);
      expect(rootOf(spans) !== undefined, "no proxy.request root");
      expect(generationOf(spans) !== undefined, "no generation record");
      const missing = withoutIdentity(spans, f.who);
      expect(missing.length === 0, "a record lacks user or session");
    },
  );
  await check("K19", `${label}: the generation records usage and cost`, () => {
    const generation = generationOf(seenIn(outcome).spans);
    expect(generation !== undefined, "no generation record");
    const usage = numbers(generation, "langfuse.observation.usage_details");
    expect(
      usage.input === 120 && usage.output === 30,
      "usage is missing or wrong",
    );
    const cost = numbers(generation, "langfuse.observation.cost_details");
    expect((cost.total ?? 0) > 0, "no cost on the generation");
  });
  await check(
    "K17",
    `${label}: with NEUROLINK_PROXY_TRACE_BODY_LOGGING=true, request and response reach the root and the generation`,
    () => {
      const { f, spans } = seenIn(outcome);
      const root = rootOf(spans);
      const generation = generationOf(spans);
      expect(
        inputOf(root).includes(`${KEEP}-REQ`),
        "the root has no request body",
      );
      expect(
        outputOf(root).includes(`${KEEP}-RESP`),
        "the root has no response body",
      );
      expect(
        inputOf(generation).includes(`${KEEP}-REQ`) &&
          outputOf(generation).includes(`${KEEP}-RESP`),
        "the generation has no request or response body",
      );
      expect(f.request.length > 0, "fixture is empty");
    },
  );
  await check(
    "K17",
    `${label}: the recorded input and output go through the exporter mask; the raw body event is outside it, as in the released build`,
    () => {
      const { f, spans } = seenIn(outcome);
      const root = rootOf(spans);
      expect(
        inputOf(root).includes("[masked]") &&
          outputOf(root).includes("[masked]"),
        "the bodies are absent or were not masked",
      );
      const tag = f.request.split(" ")[0].replace(`${KEEP}-REQ-`, "");
      const observed = spans.filter(
        (span) =>
          "langfuse.observation.input" in span.attrs ||
          "langfuse.observation.output" in span.attrs,
      );
      expect(
        observed.every(
          (span) =>
            !inputOf(span).includes(`${MASK}-REQ-${tag}`) &&
            !outputOf(span).includes(`${MASK}-RESP-${tag}`),
        ),
        "a masked token is in an observation's input or output",
      );
    },
  );
}

await check(
  "K40",
  "proxy.request exposes neurolink.user_id, neurolink.session_id and neurolink.conversation_id",
  () => {
    const { f, spans } = seenIn(claudeJson);
    const root = rootOf(spans);
    expect(root !== undefined, "no proxy.request root");
    expect(root.attrs["neurolink.user_id"] === f.who.user, "no user id key");
    expect(
      root.attrs["neurolink.session_id"] === f.who.session,
      "no session id key",
    );
    expect(
      root.attrs["neurolink.conversation_id"] === f.who.conversation,
      "no conversation id key",
    );
  },
);

await check(
  "K40",
  "proxy.request keeps proxy.* model and usage keys and no gen_ai.* model or usage key Langfuse would price",
  () => {
    const root = rootOf(seenIn(claudeJson).spans);
    expect(root !== undefined, "no proxy.request root");
    expect(
      root.attrs["proxy.usage.input_tokens"] === 120,
      "no proxy.usage key",
    );
    expect(
      root.attrs["proxy.request.model"] === CLAUDE_MODEL,
      "no proxy.request.model key",
    );
    const priced = Object.keys(root.attrs).filter(
      (key) =>
        key.startsWith("gen_ai.usage.") ||
        key === "gen_ai.request.model" ||
        key === "gen_ai.response.model",
    );
    expect(priced.length === 0, "the root carries a gen_ai model or usage key");
  },
);

await check(
  "K16",
  "Codex: the request body is recorded as input on the proxy.request root",
  () => {
    const root = rootOf(seenIn(codex).spans);
    expect(root !== undefined, "no proxy.request root");
    expect(inputOf(root).includes(`${KEEP}-REQ`), "the root has no input");
  },
);

await check(
  "K16",
  "Codex: the request body is recorded as input on the generation",
  () => {
    const generation = generationOf(seenIn(codex).spans);
    expect(generation !== undefined, "no generation record");
    expect(
      inputOf(generation).includes(`${KEEP}-REQ`),
      "the generation has no input",
    );
  },
);

await check(
  "K16",
  "Codex: the response is recorded as output on the root and the generation",
  () => {
    const { spans } = seenIn(codex);
    expect(
      outputOf(rootOf(spans)).includes(`${KEEP}-RESP`) &&
        outputOf(generationOf(spans)).includes(`${KEEP}-RESP`),
      "the response is missing",
    );
  },
);

await check(
  "K17",
  "Codex: with NEUROLINK_PROXY_TRACE_BODY_LOGGING=true, bodies are recorded and masked",
  () => {
    const { f, spans } = seenIn(codex);
    const root = rootOf(spans);
    expect(
      inputOf(root).includes("[masked]") && outputOf(root).includes("[masked]"),
      "the bodies are absent or were not masked",
    );
    const tag = f.request.split(" ")[0].replace(`${KEEP}-REQ-`, "");
    expect(
      !JSON.stringify(spans).includes(`${MASK}-REQ-${tag}`) &&
        !JSON.stringify(spans).includes(`${MASK}-RESP-${tag}`),
      "a masked token left the process",
    );
  },
);

await check(
  "K19",
  "Codex: root and generation carry the request's user and session",
  () => {
    const { f, spans } = seenIn(codex);
    expect(rootOf(spans) !== undefined, "no proxy.request root");
    expect(generationOf(spans) !== undefined, "no generation record");
    expect(
      withoutIdentity(spans, f.who).length === 0,
      "a record lacks user or session",
    );
  },
);

await check("K19", "Codex: the generation records usage and cost", () => {
  const generation = generationOf(seenIn(codex).spans);
  expect(generation !== undefined, "no generation record");
  const usage = numbers(generation, "langfuse.observation.usage_details");
  expect(usage.input === 100 && usage.output === 20, "usage is wrong");
  const cost = numbers(generation, "langfuse.observation.cost_details");
  expect((cost.total ?? 0) > 0, "no cost on the generation");
});

// ---- K17: opt-outs and redaction -----------------------------------------

async function underEnv(
  env: Record<string, string>,
  run: () => Promise<void>,
): Promise<void> {
  const before: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    before[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    await run();
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

const optedOut: Record<string, Outcome> = {};
await underEnv({ NEUROLINK_PROXY_TRACE_BODY_LOGGING: "false" }, async () => {
  optedOut.claude = await attempt(() => exercise(fixture("claude-json")));
  optedOut.codex = await attempt(() => exercise(fixture("codex")));
});

for (const label of ["claude", "codex"] as const) {
  await check(
    "K17",
    `${label}: NEUROLINK_PROXY_TRACE_BODY_LOGGING=false records no body and still records usage`,
    () => {
      const { spans } = seenIn(optedOut[label]);
      const root = rootOf(spans);
      const generation = generationOf(spans);
      expect(root !== undefined && generation !== undefined, "no records");
      expect(!hasContent(root) && !hasContent(generation), "a body leaked");
      const usage = numbers(generation, "langfuse.observation.usage_details");
      expect((usage.input ?? 0) > 0, "usage disappeared with the opt-out");
    },
  );
}

const noInputs: Record<string, Outcome> = {};
await underEnv(
  {
    NEUROLINK_PROXY_TRACE_BODY_LOGGING: "true",
    NEUROLINK_RECORD_INPUTS: "false",
  },
  async () => {
    noInputs.claude = await attempt(() => exercise(fixture("claude-json")));
    noInputs.codex = await attempt(() => exercise(fixture("codex")));
  },
);

for (const label of ["claude", "codex"] as const) {
  await check(
    "K17",
    `${label}: NEUROLINK_RECORD_INPUTS=false drops the request body, keeps response and usage`,
    () => {
      const { spans } = seenIn(noInputs[label]);
      const root = rootOf(spans);
      const generation = generationOf(spans);
      expect(root !== undefined && generation !== undefined, "no records");
      expect(
        inputOf(root) === "" && inputOf(generation) === "",
        "the request body was recorded",
      );
      expect(
        outputOf(root).includes(`${KEEP}-RESP`),
        "the response disappeared with the input opt-out",
      );
      const usage = numbers(generation, "langfuse.observation.usage_details");
      expect((usage.input ?? 0) > 0, "usage disappeared");
    },
  );
}

const redacted: Record<string, Outcome> = {};
{
  const registry = getExporterRegistry();
  const original = registry.get("langfuse");
  const redacting = new LangfuseExporter({
    enabled: true,
    publicKey: "pk-proof",
    secretKey: "sk-proof",
    baseUrl: ingest.url,
    redactIO: true,
    maxBufferSize: 100,
    flushIntervalMs: 600_000,
  });
  await redacting.initialize();
  registry.unregister("langfuse");
  registry.register(redacting);
  try {
    await underEnv({ NEUROLINK_PROXY_TRACE_BODY_LOGGING: "true" }, async () => {
      redacted.claude = await attempt(() => exercise(fixture("claude-json")));
      redacted.codex = await attempt(() => exercise(fixture("codex")));
    });
  } finally {
    registry.unregister("langfuse");
    if (original) {
      registry.register(original);
    }
    await redacting.shutdown();
  }
}

for (const label of ["claude", "codex"] as const) {
  await check(
    "K17",
    `${label}: redactIO removes input and output from every observation and keeps usage; the raw body event is outside it, as in the released build`,
    () => {
      const { spans } = seenIn(redacted[label]);
      const leaked = spans.filter(
        (s) =>
          "langfuse.observation.input" in s.attrs ||
          "langfuse.observation.output" in s.attrs ||
          "langfuse.trace.input" in s.attrs ||
          "langfuse.trace.output" in s.attrs,
      );
      expect(leaked.length === 0, "a record kept its input or output");
      const elsewhere = spans.flatMap((span) => [
        ...Object.entries(span.attrs)
          .filter(([, value]) => String(value).includes(KEEP))
          .map(([key]) => `${span.name}:attr:${key}`),
        ...span.events.flatMap((event) =>
          Object.entries(event.attrs)
            .filter(([, value]) => String(value).includes(KEEP))
            .map(([key]) => `${span.name}:event:${key}`),
        ),
      ]);
      expect(
        elsewhere.every((place) => place.endsWith(":event:proxy.body")),
        `a body appears outside the raw body events: ${elsewhere.join(", ")}`,
      );
      const generation = generationOf(spans);
      expect(generation !== undefined, "no generation record");
      const usage = numbers(generation, "langfuse.observation.usage_details");
      expect((usage.input ?? 0) > 0, "usage disappeared");
    },
  );
}

await check(
  "K17",
  "raw body span events stay off by default; the exporter mask does not reach them",
  () => {
    const probe = probeRawBodyEvents({});
    expect(probe.eventCount === 1, "the request body event is missing");
    expect(
      probe.bodies.every((body) => body === ""),
      "a raw body is on a span event by default",
    );
  },
);

await check(
  "K17",
  "NEUROLINK_PROXY_TRACE_BODY_LOGGING=true still emits the redacted raw body event",
  () => {
    const probe = probeRawBodyEvents({
      NEUROLINK_PROXY_TRACE_BODY_LOGGING: "true",
    });
    expect(
      probe.bodies.some(
        (body) => body.includes("readable") && body.includes("[REDACTED]"),
      ),
      "the explicit opt-in no longer emits the body event",
    );
  },
);

// ---- Realtime voice ---------------------------------------------------------

await check(
  "K19",
  "realtime: a finished exchange is traced as one realtime-turn with its generation, user and session",
  async () => {
    ingest.reset();
    const call = voiceCall();
    const store = fakeStore();
    const memory = await setUpRealtimeCallMemory(call.ctx, store.config, {
      model: "gemini-live-proof",
    });
    expect(memory !== undefined, "no memory for a verified call");
    memory.recorder.userTranscript({ text: "how are sales", final: true });
    memory.recorder.assistantMessage({ id: "turn-a", text: "Sales are up." });
    await memory.recorder.flush(2_000);
    await settle(() => realtimeTurns(call.session).length >= 1);
    const turns = realtimeTurns(call.session);
    expect(turns.length === 1, "the turn was not traced exactly once");
    expect(turns[0].attrs["user.id"] === call.user, "the turn has no user");
    const generation = ingest.seen.find(
      (s) => s.name === "realtime" && s.traceId === turns[0].traceId,
    );
    expect(generation !== undefined, "the turn has no generation");
    expect(
      String(generation.attrs["langfuse.observation.model.name"]) ===
        "gemini-live-proof",
      "the generation has no model",
    );
    expect(
      inputOf(generation).includes("how are sales") &&
        outputOf(generation).includes("Sales are up."),
      "the generation lost the exchange",
    );
    expect(
      String(turns[0].attrs["langfuse.trace.tags"] ?? "").includes("voice"),
      "the turn is not tagged voice",
    );
  },
);

await check(
  "K19",
  "realtime: a turn whose write is retried is traced once",
  async () => {
    ingest.reset();
    const call = voiceCall();
    const store = fakeStore(1);
    const memory = await setUpRealtimeCallMemory(call.ctx, store.config);
    expect(memory !== undefined, "no memory for a verified call");
    memory.recorder.userTranscript({ text: "retry me", final: true });
    memory.recorder.assistantMessage({ id: "turn-r", text: "Retried." });
    await memory.recorder.flush(3_000);
    expect(store.attempts() === 2, "the write was not retried");
    expect(store.stored.length === 1, "the turn was not stored after retry");
    await settle(() => realtimeTurns(call.session).length >= 1);
    await settle();
    expect(
      realtimeTurns(call.session).length === 1,
      "the retried turn was traced more than once",
    );
  },
);

await check(
  "K03",
  "realtime shutdown delivers the final turn's trace before the callback returns",
  async () => {
    ingest.reset();
    const call = voiceCall();
    const store = fakeStore();
    const memory = await setUpRealtimeCallMemory(call.ctx, store.config);
    expect(memory !== undefined, "no memory for a verified call");
    memory.recorder.userTranscript({ text: "last question", final: true });
    memory.recorder.assistantDelta("half an answer");
    for (const callback of call.callbacks) {
      await callback();
    }
    const delivered = realtimeTurns(call.session).length;
    await settle();
    expect(
      delivered === 1,
      "the final turn was still buffered when shutdown finished",
    );
  },
);

await check(
  "K03",
  "realtime shutdown starts the flush and returns within the flush budget when Langfuse stalls",
  async () => {
    ingest.reset();
    const call = voiceCall();
    const store = fakeStore();
    const memory = await setUpRealtimeCallMemory(call.ctx, {
      ...store.config,
      flushBudgetMs: 300,
    });
    expect(memory !== undefined, "no memory for a verified call");
    memory.recorder.userTranscript({ text: "stalled", final: true });
    memory.recorder.assistantDelta("answer");
    const requestsBefore = ingest.requests();
    ingest.stall(4_000);
    const startedAt = Date.now();
    try {
      for (const callback of call.callbacks) {
        await callback();
      }
      const elapsed = Date.now() - startedAt;
      expect(ingest.requests() > requestsBefore, "no flush was attempted");
      expect(elapsed < 1_500, "shutdown waited for the stalled endpoint");
    } finally {
      ingest.stall(0);
      ingest.release();
    }
  },
);

await check(
  "K18",
  "realtime calls without voice memory are traced when tracing is on",
  async () => {
    ingest.reset();
    const call = voiceCall(false);
    expect(
      (await setUpRealtimeCallMemory(call.ctx, fakeStore().config)) ===
        undefined,
      "the call unexpectedly has memory",
    );
    const setUp = (realtimeMemoryModule as Record<string, unknown>)[
      "setUpRealtimeCallTracing"
    ] as
      | ((
          ctx: VoiceCall["ctx"],
          options: { model?: string },
        ) => VoiceRecorder | undefined | Promise<VoiceRecorder | undefined>)
      | undefined;
    expect(
      typeof setUp === "function",
      "there is no tracing path for a call without memory",
    );
    const recorder = await setUp(call.ctx, { model: "gemini-live-proof" });
    expect(recorder !== undefined, "no recorder although tracing is on");
    recorder.userTranscript({ text: "no memory here", final: true });
    recorder.assistantMessage({ id: "turn-n", text: "Traced anyway." });
    for (const callback of call.callbacks) {
      await callback();
    }
    await settle(() => realtimeTurns(call.room).length >= 1);
    const turns = realtimeTurns(call.room);
    expect(turns.length === 1, "the turn was not traced exactly once");
    expect(turns[0].attrs["user.id"] === undefined, "an unverified user id");
  },
);

await check(
  "K18",
  "the realtime agent wires the tracing-only recorder when memory is absent",
  () => {
    const source = readFileSync(
      fileURLToPath(
        new URL(
          "../src/lib/voice/livekit/realtimeVoiceAgent.ts",
          import.meta.url,
        ),
      ),
      "utf8",
    );
    expect(
      source.includes("setUpRealtimeCallTracing("),
      "the agent never sets up call tracing without memory",
    );
  },
);

async function toolRecords(
  record: (recorder: VoiceRecorder) => void,
): Promise<SeenSpan[]> {
  ingest.reset();
  const call = voiceCall();
  const memory = await setUpRealtimeCallMemory(call.ctx, fakeStore().config);
  expect(memory !== undefined, "no memory for a verified call");
  memory.recorder.userTranscript({ text: "run the lookups", final: true });
  record(memory.recorder);
  memory.recorder.assistantMessage({ id: "turn-t", text: "Both done." });
  await memory.recorder.flush(2_000);
  await settle(() => realtimeTurns(call.session).length >= 1);
  await settle();
  return ingest.seen.filter(
    (s) => s.name === "lookup" && s.attrs["session.id"] === call.session,
  );
}

function pairedWrongly(tools: SeenSpan[]): string[] {
  return tools
    .filter((s) => {
      const input = inputOf(s);
      const output = outputOf(s);
      return (
        (input.includes("first") && !output.includes("result-first")) ||
        (input.includes("second") && !output.includes("result-second"))
      );
    })
    .map((s) => inputOf(s));
}

await check(
  "K36",
  "overlapping same-name tool calls get their own results, paired in order",
  async () => {
    const tools = await toolRecords((recorder) => {
      recorder.toolStart({ name: "lookup", args: { q: "first" } });
      recorder.toolStart({ name: "lookup", args: { q: "second" } });
      recorder.toolEnd({ name: "lookup", result: "result-first" });
      recorder.toolEnd({ name: "lookup", result: "result-second" });
    });
    expect(tools.length === 2, "the two calls were not both recorded");
    expect(pairedWrongly(tools).length === 0, "a call got the wrong result");
  },
);

await check(
  "K36",
  "overlapping same-name tool calls that finish out of order are paired by call id",
  async () => {
    const tools = await toolRecords((recorder) => {
      recorder.toolStart({
        name: "lookup",
        args: { q: "first" },
        callId: "c1",
      });
      recorder.toolStart({
        name: "lookup",
        args: { q: "second" },
        callId: "c2",
      });
      recorder.toolEnd({
        name: "lookup",
        result: "result-second",
        callId: "c2",
      });
      recorder.toolEnd({
        name: "lookup",
        result: "result-first",
        callId: "c1",
      });
    });
    expect(tools.length === 2, "the two calls were not both recorded");
    expect(pairedWrongly(tools).length === 0, "a call got the wrong result");
  },
);

// ---- Close down --------------------------------------------------------------

await openai.close();
await ingest.close();

console.log(failures === 0 ? "SUITE PASS" : `SUITE FAIL ${failures}`);
process.exit(failures === 0 ? 0 : 1);
