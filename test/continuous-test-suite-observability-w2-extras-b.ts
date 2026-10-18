#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability, wave-2 extras B (proxy and provider side)
 *
 * Determinism exception (CLAUDE.md rule 15). What is asserted is what the
 * proxy, the realtime voice wiring and the provider telemetry helpers put on
 * the wire to Langfuse, and each defect hangs on an input a live call cannot be
 * made to produce: a Codex stream whose `response.completed.output` is empty, a
 * Claude stream whose `message_start` already reports a token, a tracer that
 * starts before anything has started telemetry, a tool whose name cannot be
 * stringified, a SageMaker stream whose finish part is out of spec, a provider
 * result that carries no stream. So the suite drives the REAL proxy routes
 * (`createProxyStartApp`), the REAL `setUpRealtimeCallMemory`, the REAL
 * `AIProviderFactory` / `AmazonSageMakerProvider` / `NeuroLink` and the REAL
 * `ProxyTracer` from `src/` against local stand-ins: a stubbed `fetch` for the
 * Anthropic and Codex replies, local OpenAI-compatible and Gemini servers, and a
 * local Langfuse OTLP receiver that decodes what NeuroLink's own exporter posts.
 * Checks that depend on the process's first tracer call, on whether a span is
 * recording, or on a host-owned provider run in a fresh child process of this
 * same file (`child:<mode>`). Everything is imported from `src/`; nothing is
 * imported from `dist`.
 *
 * Every check prints exactly one `PROOF <id> PASS|FAIL <description>` line and
 * the process exits non-zero if any check failed. No keys, no live calls.
 *
 * PROOF_TRACER_MODULE (optional) points the direct `ProxyTracer` probes of X26
 * and X30 at another copy of the tracer, so the same probes can be run against
 * the tracer as PR 2002 merged it (see the matrix for the exact command).
 *
 * Run: pnpm exec tsx test/continuous-test-suite-observability-w2-extras-b.ts
 */
import "./helpers/credentialFreeEnv.js";
import "./helpers/proxyTestIsolation.js";
import type { JsonValue } from "../src/lib/types/common.js";
import { spawn } from "node:child_process";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
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

const SELF = fileURLToPath(import.meta.url);
const TRACER_MODULE =
  process.env.PROOF_TRACER_MODULE ?? "../src/lib/proxy/proxyTracer.js";
const BIG_BODY_CHARS = 1_000_000;

// ---------------------------------------------------------------------------
// Child modes: one fresh process per environment, results as one JSON line
// ---------------------------------------------------------------------------

function childEnv(name: string): string {
  return process.env[name] ?? "";
}

function useProofLangfuse(): void {
  process.env.LANGFUSE_PUBLIC_KEY = "pk-proof";
  process.env.LANGFUSE_SECRET_KEY = "sk-proof";
  process.env.LANGFUSE_BASE_URL = childEnv("PROOF_INGEST_URL");
}

/** First proxy call of a process that never started telemetry (X01, X31). */
async function childFirstProxyCall(
  mode: "request" | "http" | "control",
): Promise<Record<string, unknown>> {
  useProofLangfuse();
  const requestId = childEnv("PROOF_REQUEST_ID");
  const { ensureTelemetry, flushOpenTelemetry } =
    await import("../src/lib/services/server/ai/observability/instrumentation.js");
  if (mode === "control") {
    ensureTelemetry();
  }
  const { ProxyTracer, startProxyHttpTrace } = await import(TRACER_MODULE);
  if (mode === "http") {
    const { context, trace } = await import("@opentelemetry/api");
    const http = startProxyHttpTrace(
      { requestId, method: "POST", path: "/v1/messages" },
      {},
    );
    const recording = http.run(
      () => trace.getSpan(context.active())?.isRecording() ?? false,
    );
    http.end(200, "ok");
    await flushOpenTelemetry();
    return { recording };
  }
  const tracer = ProxyTracer.startRequest(
    {
      requestId,
      method: "POST",
      path: "/v1/messages",
      model: "claude-x",
      stream: false,
      toolCount: 0,
    },
    { "x-neurolink-session-id": childEnv("PROOF_SESSION") },
  );
  const receive = tracer.startReceive();
  const recording = receive.isRecording();
  receive.end();
  tracer.end(200, 5);
  await flushOpenTelemetry();
  return { recording };
}

/** A huge request and response body through a tracer whose root may not record (X26). */
async function childBodiesWithoutRecording(
  recording: boolean,
): Promise<Record<string, unknown>> {
  process.env.NEUROLINK_PROXY_TRACE_BODY_LOGGING = "true";
  delete process.env.NEUROLINK_RECORD_INPUTS;
  if (recording) {
    useProofLangfuse();
    const { ensureTelemetry } =
      await import("../src/lib/services/server/ai/observability/instrumentation.js");
    ensureTelemetry();
  }
  const { ProxyTracer } = await import(TRACER_MODULE);
  const big = JSON.stringify({
    model: "m",
    messages: Array.from({ length: 4000 }, (_, i) => ({
      role: "user",
      content: `message ${i} `.repeat(120),
    })),
  });
  const stringify = JSON.stringify;
  const parse = JSON.parse;
  let maxStringified = 0;
  let maxParsed = 0;
  JSON.stringify = ((...args: Parameters<typeof JSON.stringify>) => {
    const out = stringify(...args);
    maxStringified = Math.max(maxStringified, out?.length ?? 0);
    return out;
  }) as typeof JSON.stringify;
  JSON.parse = ((text: string, reviver?: Parameters<typeof parse>[1]) => {
    maxParsed = Math.max(maxParsed, text.length);
    return parse(text, reviver);
  }) as typeof JSON.parse;
  let rootRecording: boolean | undefined;
  try {
    const tracer = ProxyTracer.startRequest({
      requestId: "x26",
      method: "POST",
      path: "/v1/messages",
      model: "claude-x",
      stream: false,
      toolCount: 0,
    });
    const receive = tracer.startReceive();
    rootRecording = receive.isRecording();
    receive.end();
    tracer.logRequestBody(big);
    tracer.logUpstreamResponseBody(big);
    tracer.end(200, 5);
  } finally {
    JSON.stringify = stringify;
    JSON.parse = parse;
  }
  return {
    rootRecording: rootRecording === true,
    maxStringified,
    maxParsed,
    bodyChars: big.length,
  };
}

/** Vertex generate() through a host-owned provider: which spans carry observation content (X15). */
async function childVertexGenerate(): Promise<Record<string, unknown>> {
  const { InMemorySpanExporter, SimpleSpanProcessor } =
    await import("@opentelemetry/sdk-trace-base");
  const { NodeTracerProvider } = await import("@opentelemetry/sdk-trace-node");
  const exporter = new InMemorySpanExporter();
  new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  }).register();
  const server = createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(
        `data: ${JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: "vertex answer" }], role: "model" },
              finishReason: "STOP",
              index: 0,
            },
          ],
          usageMetadata: {
            promptTokenCount: 5,
            candidatesTokenCount: 4,
            totalTokenCount: 9,
          },
        })}\r\n\r\n`,
      );
      res.end();
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const { NeuroLink } = await import("../src/lib/neurolink.js");
  const neurolink = new NeuroLink();
  const result = await neurolink.generate({
    input: { text: "vertex prompt" },
    provider: "vertex",
    model: "gemini-2.0-flash",
    maxTokens: 32,
    disableTools: true,
    disableInternalFallback: true,
    credentials: {
      vertex: { apiKey: "express-key", baseURL: `http://127.0.0.1:${port}` },
    },
  });
  server.closeAllConnections();
  server.close();
  const spans = exporter.getFinishedSpans().map((span) => ({
    name: span.name,
    hasInput: span.attributes["langfuse.observation.input"] !== undefined,
    hasOutput: span.attributes["langfuse.observation.output"] !== undefined,
    type: String(span.attributes["langfuse.observation.type"] ?? ""),
    internal: span.attributes["langfuse.internal"] === true,
  }));
  return { content: String(result?.content ?? ""), spans };
}

const childMode = process.argv[2]?.startsWith("child:")
  ? process.argv[2].slice("child:".length)
  : undefined;
if (childMode !== undefined) {
  const outcome: Record<string, unknown> =
    childMode === "x31-request" || childMode === "x31-http"
      ? await childFirstProxyCall(childMode === "x31-http" ? "http" : "request")
      : childMode === "x31-control"
        ? await childFirstProxyCall("control")
        : childMode === "x26"
          ? await childBodiesWithoutRecording(false)
          : childMode === "x26-control"
            ? await childBodiesWithoutRecording(true)
            : childMode === "x15"
              ? await childVertexGenerate()
              : { error: `unknown child mode ${childMode}` };
  console.log(`CHILD ${JSON.stringify(outcome)}`);
  process.exit(0);
}

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
  reset: () => void;
  close: () => Promise<void>;
};

async function startIngest(): Promise<Ingest> {
  const seen: SeenSpan[] = [];
  const server: Server = createServer((req: IncomingMessage, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
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
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
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
    reset: () => {
      seen.length = 0;
    },
    close: () =>
      new Promise<void>((resolve) => {
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
// Set before the tracer is imported: an older copy of it reads the flag once, at load.
process.env.NEUROLINK_PROXY_TRACE_BODY_LOGGING = "true";
delete process.env.NEUROLINK_RECORD_INPUTS;

const { ensureTelemetry, flushOpenTelemetry, getLangfuseHealthStatus } =
  await import("../src/lib/services/server/ai/observability/instrumentation.js");
/** Masks every MASKME-* token; leaves KEEP-* tokens readable. */
function maskSecrets({ data }: { data: JsonValue }): JsonValue {
  return JSON.parse(
    JSON.stringify(data).replace(/MASKME-[A-Z0-9-]+/g, "[masked]"),
  );
}

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

const { ProxyTracer } = await import(TRACER_MODULE);
const { createProxyStartApp } = await import("../src/cli/commands/proxy.js");
const { getProxyActivitySnapshot } =
  await import("../src/lib/proxy/proxyActivity.js");
const { tokenStore } = await import("../src/lib/auth/tokenStore.js");
const { initRequestLogger, flushRequestLogs } =
  await import("../src/lib/proxy/requestLogger.js");
const { flushProxyLifecycleEvents } =
  await import("../src/lib/proxy/proxyLifecycle.js");
const { createSSEInterceptor } =
  await import("../src/lib/proxy/sseInterceptor.js");
const { createCodexUsageTap } = await import("../src/lib/proxy/codexUsage.js");
const { setUpRealtimeCallMemory } =
  await import("../src/lib/voice/livekit/realtimeMemory.js");
const { signVoiceMemoryBinding } =
  await import("../src/lib/voice/livekit/memoryBinding.js");
const { withStreamSpan } = await import("../src/lib/telemetry/withSpan.js");
const { AIProviderFactory } = await import("../src/lib/core/factory.js");
const { AmazonSageMakerProvider } =
  await import("../src/lib/providers/amazonSagemaker.js");
const { NeuroLink } = await import("../src/lib/neurolink.js");
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

/** Delivers what has been recorded and gives a late span a moment to arrive. */
async function drain(): Promise<void> {
  await pause(120);
  await flushOpenTelemetry();
  await pause(60);
  await flushOpenTelemetry();
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

/** Runs this file as a child process in `mode` and returns its one result line. */
async function runChild(
  mode: string,
  env: Record<string, string>,
): Promise<Record<string, unknown>> {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", SELF, `child:${mode}`],
    {
      env: {
        ...process.env,
        PROOF_INGEST_URL: ingest.url,
        ...env,
      },
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk: Buffer) => {
    stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
  });
  const code = await new Promise<number | null>((resolve) => {
    child.on("close", resolve);
  });
  const line = stdout
    .split("\n")
    .reverse()
    .find((l) => l.startsWith("CHILD "));
  expect(
    line !== undefined,
    `child ${mode} produced no result (exit ${code}): ${stderr.slice(-400)}`,
  );
  return JSON.parse(line.slice("CHILD ".length)) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Proxy fixtures: real routes, recorded upstream replies
// ---------------------------------------------------------------------------

const CLAUDE_MODEL = "claude-sonnet-4-6";
const CODEX_MODEL = "gpt-5.1-codex";

type Who = { user: string; session: string; conversation: string };
type Kind = "claude-stream" | "codex";
type Fixture = {
  kind: Kind;
  who: Who;
  request: string;
  answer: string;
  /** The upstream reply, as raw SSE. */
  upstream: string;
};

const sseFrame = (event: string, data: object) =>
  `event: ${event}\ndata: ${JSON.stringify({ type: event, ...data })}\n\n`;

/** An Anthropic stream whose message_start already reports `startOutput` tokens. */
function claudeStreamBody(
  answer: string,
  startOutput: number,
  finalOutput: number,
): string {
  return (
    sseFrame("message_start", {
      message: {
        id: "msg_proof",
        type: "message",
        role: "assistant",
        model: CLAUDE_MODEL,
        content: [],
        usage: {
          input_tokens: 120,
          output_tokens: startOutput,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
        },
      },
    }) +
    sseFrame("content_block_start", {
      index: 0,
      content_block: { type: "text", text: "" },
    }) +
    sseFrame("content_block_delta", {
      index: 0,
      delta: { type: "text_delta", text: answer },
    }) +
    sseFrame("content_block_stop", { index: 0 }) +
    sseFrame("message_delta", {
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: finalOutput },
    }) +
    sseFrame("message_stop", {})
  );
}

const codexUsage = {
  input_tokens: 100,
  output_tokens: 20,
  input_tokens_details: { cached_tokens: 0 },
  output_tokens_details: { reasoning_tokens: 0 },
};

const codexMessage = (answer: string) => ({
  type: "message",
  role: "assistant",
  content: [{ type: "output_text", text: answer }],
});

/** A Codex stream that delivers the message only through response.output_item.done. */
function codexItemsOnlyBody(answer: string, completed: object): string {
  return (
    sseFrame("response.output_item.done", {
      output_index: 0,
      item: codexMessage(answer),
    }) +
    sseFrame("response.completed", {
      response: {
        id: "resp_proof",
        model: CODEX_MODEL,
        status: "completed",
        usage: codexUsage,
        ...completed,
      },
    })
  );
}

let sequence = 0;
function fixture(kind: Kind, upstream: (answer: string) => string): Fixture {
  sequence += 1;
  const tag = `${kind}-${sequence}`.toUpperCase();
  const answer = `KEEP-RESP-${tag}`;
  return {
    kind,
    who: {
      user: `user-${kind}-${sequence}`,
      session: `session-${kind}-${sequence}`,
      conversation: `conversation-${kind}-${sequence}`,
    },
    request: `KEEP-REQ-${tag}`,
    answer,
    upstream: upstream(answer),
  };
}

const delegate = globalThis.fetch;

async function withProxy(
  f: Fixture,
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
      (url.hostname === "api.anthropic.com" &&
        url.pathname.endsWith("/messages")) ||
      (url.hostname === "chatgpt.com" && url.pathname.endsWith("/responses"))
    ) {
      return new Response(f.upstream, {
        headers: { "content-type": "text/event-stream" },
      });
    }
    return delegate(input, init);
  };
  try {
    const { app } = await createProxyStartApp({
      neurolink: {
        getToolRegistry: () => ({}),
      } as Parameters<typeof createProxyStartApp>[0]["neurolink"],
      modelRouter: undefined,
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
          stream: true,
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

type Observed = { f: Fixture; spans: SeenSpan[]; root: SeenSpan };

/** Sends one request through the real route and returns its trace's spans. */
async function exercise(f: Fixture): Promise<Observed> {
  ingest.reset();
  let status = 0;
  await withProxy(f, async (response) => {
    status = response.status;
    await response.text();
  });
  expect(status === 200, "the proxy did not answer the fixture request");
  await settle(() =>
    bySession(f.who.session).some((s) => s.name === "proxy.request"),
  );
  const root = bySession(f.who.session).find((s) => s.name === "proxy.request");
  expect(root !== undefined, "no proxy.request record reached Langfuse");
  await settle(() => generationsOf(traceOf(root.traceId)).length > 0);
  return { f, spans: traceOf(root.traceId), root };
}

async function attempt<T>(
  run: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; reason: string }> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "scenario failed",
    };
  }
}

function valueOf<T>(
  outcome: { ok: true; value: T } | { ok: false; reason: string },
): T {
  if (!outcome.ok) {
    throw new Error(outcome.reason);
  }
  return outcome.value;
}

// ---------------------------------------------------------------------------
// S01: streamed Claude output tokens
// ---------------------------------------------------------------------------

async function interceptedUsage(sse: string) {
  const { stream, telemetry } = createSSEInterceptor();
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  const pump = (async () => {
    while (!(await reader.read()).done) {
      // The interceptor is a pass-through; only its telemetry matters here.
    }
  })();
  await writer.write(new TextEncoder().encode(sse));
  await writer.close();
  await pump;
  return (await telemetry).usage;
}

await check(
  "S01",
  "interceptor: message_start reporting 1 output token and message_delta the cumulative 15 give 15, not 16",
  async () => {
    const usage = await interceptedUsage(claudeStreamBody("hello", 1, 15));
    expect(
      usage.outputTokens === 15,
      `output tokens read ${usage.outputTokens}, the stream's true count is 15`,
    );
  },
);

await check(
  "S01",
  "interceptor: a stream whose message_start reports 0 still reads the message_delta count",
  async () => {
    const usage = await interceptedUsage(claudeStreamBody("hello", 0, 30));
    expect(
      usage.outputTokens === 30,
      `output tokens read ${usage.outputTokens}`,
    );
  },
);

await check(
  "S01",
  "interceptor: a stream cut before message_delta keeps the count message_start reported",
  async () => {
    const full = claudeStreamBody("hello", 3, 15);
    const cut = full.slice(0, full.indexOf("event: message_delta"));
    const usage = await interceptedUsage(cut);
    expect(
      usage.outputTokens === 3,
      `output tokens read ${usage.outputTokens}`,
    );
  },
);

const claudeStreaming = await attempt(() =>
  exercise(
    fixture("claude-stream", (answer) => claudeStreamBody(answer, 1, 30)),
  ),
);

await check(
  "S01",
  "proxy route: the recorded generation's output usage is the stream's true 30, not 31",
  () => {
    const { spans } = valueOf(claudeStreaming);
    const generation = generationsOf(spans)[0];
    expect(generation !== undefined, "no generation record in the trace");
    const usage = numbers(generation, "langfuse.observation.usage_details");
    expect(usage.output === 30, `recorded output tokens ${usage.output}`);
  },
);

// ---------------------------------------------------------------------------
// X30 and X26: what the proxy root records as output, and when it does not record
// ---------------------------------------------------------------------------

const RAW_SSE = [
  'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_1","model":"claude-x","usage":{"input_tokens":3,"output_tokens":0}}}',
  'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello there"}}',
  'event: message_stop\ndata: {"type":"message_stop"}',
].join("\n\n");

async function proxyRootOutput(
  label: string,
  order: "as-routes" | "reversed",
): Promise<string> {
  ingest.reset();
  const session = `x30-${label}`;
  const tracer = ProxyTracer.startRequest(
    {
      requestId: session,
      method: "POST",
      path: "/v1/messages",
      model: "claude-x",
      stream: true,
      toolCount: 0,
      sessionId: session,
    },
    {},
  );
  const parsed = [{ type: "text", text: "Hello there" }];
  const respond = () =>
    tracer.setResponseInfo({
      output: parsed,
      responseModel: "claude-x",
      finishReason: "end_turn",
    });
  if (order === "as-routes") {
    respond();
    tracer.logUpstreamResponseBody(RAW_SSE);
  } else {
    tracer.logUpstreamResponseBody(RAW_SSE);
    respond();
  }
  tracer.end(200, 5);
  await settle(() =>
    bySession(session).some((s) => s.name === "proxy.request"),
  );
  return outputOf(bySession(session).find((s) => s.name === "proxy.request"));
}

await check(
  "X30",
  "tracer: parsed output set before the raw upstream body stays the root output",
  async () => {
    const output = await proxyRootOutput("as-routes", "as-routes");
    expect(
      !output.includes("event: message_start"),
      "the root output is the raw SSE text",
    );
    expect(output.includes("Hello there"), "the parsed text is not recorded");
  },
);

await check(
  "X30",
  "tracer: control, the raw body logged first and the parsed output second gives the parsed output",
  async () => {
    const output = await proxyRootOutput("reversed", "reversed");
    expect(
      !output.includes("event: message_start") &&
        output.includes("Hello there"),
      "the reversed order does not record the parsed output",
    );
  },
);

await check(
  "X30",
  "proxy route: a streamed Claude reply is recorded as its content, not as raw SSE text",
  () => {
    const { root, f } = valueOf(claudeStreaming);
    const output = outputOf(root);
    expect(
      !output.includes("event: message_start"),
      "the proxy root output is raw SSE text",
    );
    expect(
      output.includes(f.answer),
      "the proxy root output does not hold the answer",
    );
  },
);

await check(
  "X26",
  "a non-recording root keeps and serialises no body (6 MB request and response)",
  async () => {
    const run = await runChild("x26", {});
    expect(run.rootRecording === false, "the probe root is recording");
    expect(
      Number(run.maxParsed) < BIG_BODY_CHARS &&
        Number(run.maxStringified) < BIG_BODY_CHARS,
      `bodies were processed: parsed ${run.maxParsed} chars, serialised ${run.maxStringified} chars of a ${run.bodyChars} char body`,
    );
  },
);

await check(
  "X26",
  "control: a recording root does process the same bodies (the probe can see the work)",
  async () => {
    const run = await runChild("x26-control", {});
    expect(run.rootRecording === true, "the control root is not recording");
    expect(
      Number(run.maxParsed) >= BIG_BODY_CHARS,
      "the control run never parsed the body, so the probe measures nothing",
    );
  },
);

// ---------------------------------------------------------------------------
// X01 and X31: the first proxy call starts telemetry
// ---------------------------------------------------------------------------

async function firstProxyCall(mode: string, key: string) {
  const run = await runChild(mode, {
    PROOF_REQUEST_ID: `req-${key}`,
    PROOF_SESSION: `session-${key}`,
  });
  return run;
}

await check(
  "X31",
  "control: after ensureTelemetry the first proxy root records and reaches Langfuse",
  async () => {
    ingest.reset();
    const run = await firstProxyCall("x31-control", "control");
    expect(run.recording === true, "the control root is not recording");
    await settle(() => bySession("session-control").length > 0);
  },
);

await check(
  "X31",
  "the first proxy.request of a process that never started telemetry records",
  async () => {
    const run = await firstProxyCall("x31-request", "first");
    expect(
      run.recording === true,
      "the first proxy root span is a no-op: nothing started telemetry",
    );
  },
);

await check(
  "X31",
  "the first proxy.request of such a process reaches Langfuse",
  async () => {
    await settle(() =>
      bySession("session-first").some((s) => s.name === "proxy.request"),
    );
  },
);

await check(
  "X31",
  "the first proxy.http.request span of such a process records",
  async () => {
    const run = await firstProxyCall("x31-http", "http");
    expect(
      run.recording === true,
      "the first proxy.http.request span is a no-op",
    );
  },
);

await check(
  "X01",
  "embedded proxy with only the Langfuse keys: request #1 is recorded, not only request #2",
  async () => {
    const run = await firstProxyCall("x31-request", "embedded");
    expect(run.recording === true, "request #1 was not recorded");
    await settle(() =>
      bySession("session-embedded").some((s) => s.name === "proxy.request"),
    );
  },
);

// ---------------------------------------------------------------------------
// X29: a Codex stream that delivers its message through output_item.done only
// ---------------------------------------------------------------------------

async function tapEvidence(sse: string) {
  const tap = createCodexUsageTap();
  const writer = tap.stream.writable.getWriter();
  const reader = tap.stream.readable.getReader();
  const pump = (async () => {
    while (!(await reader.read()).done) {
      // Pass-through.
    }
  })();
  await writer.write(new TextEncoder().encode(sse));
  await writer.close();
  await pump;
  await tap.usage;
  return tap.evidence();
}

const evidenceText = (evidence: Awaited<ReturnType<typeof tapEvidence>>) =>
  JSON.stringify(evidence.response?.output ?? null);

await check(
  "X29",
  "control: a completed response that carries its output is recorded as before",
  async () => {
    const evidence = await tapEvidence(
      codexItemsOnlyBody("FULL-ANSWER", {
        output: [codexMessage("FULL-ANSWER")],
      }),
    );
    expect(evidenceText(evidence).includes("FULL-ANSWER"), "output missing");
  },
);

await check(
  "X29",
  "tap: output items seen only via response.output_item.done fill an empty completed.output",
  async () => {
    const evidence = await tapEvidence(
      codexItemsOnlyBody("DONE-ONLY", { output: [] }),
    );
    expect(
      evidenceText(evidence).includes("DONE-ONLY"),
      `the recorded output is ${evidenceText(evidence)}`,
    );
  },
);

await check(
  "X29",
  "tap: output items seen only via response.output_item.done fill a completed response without an output key",
  async () => {
    const evidence = await tapEvidence(codexItemsOnlyBody("NO-KEY", {}));
    expect(
      evidenceText(evidence).includes("NO-KEY"),
      `the recorded output is ${evidenceText(evidence)}`,
    );
  },
);

await check(
  "X29",
  "tap: the items of a completed response win over the stream's output_item.done items",
  async () => {
    const evidence = await tapEvidence(
      codexItemsOnlyBody("STREAMED", {
        output: [codexMessage("AUTHORITATIVE")],
      }),
    );
    const recorded = evidenceText(evidence);
    expect(
      recorded.includes("AUTHORITATIVE") && !recorded.includes("STREAMED"),
      `the recorded output is ${recorded}`,
    );
  },
);

const codexEmptyCompleted = await attempt(() =>
  exercise(
    fixture("codex", (answer) => codexItemsOnlyBody(answer, { output: [] })),
  ),
);

await check(
  "X29",
  "proxy route: the Codex root output holds the assistant message when completed.output is empty",
  () => {
    const { root, f } = valueOf(codexEmptyCompleted);
    expect(
      outputOf(root).includes(f.answer),
      `the Codex root output is ${outputOf(root).slice(0, 120)}`,
    );
  },
);

// ---------------------------------------------------------------------------
// X44: a realtime turn whose tool name cannot be stringified
// ---------------------------------------------------------------------------

const VOICE_SECRET = "proof-secret-with-more-than-sixteen-chars";
let voiceSequence = 0;

function voiceCall() {
  voiceSequence += 1;
  const room = `proof-room-${voiceSequence}`;
  const session = `voice-session-${voiceSequence}`;
  const binding = signVoiceMemoryBinding({
    room,
    userId: `voice-user-${voiceSequence}`,
    sessionId: session,
    secret: VOICE_SECRET,
  });
  const metadata = Buffer.from(
    JSON.stringify({ authToken: "t", mcpContext: {}, memory: binding }),
  ).toString("base64");
  const ctx = {
    room: { name: room, metadata },
    addShutdownCallback: () => undefined,
  } as unknown as Parameters<typeof setUpRealtimeCallMemory>[0];
  return { ctx, session };
}

async function realtimeTurnWithTool(toolName: unknown) {
  ingest.reset();
  const call = voiceCall();
  const stored: string[] = [];
  const memory = await setUpRealtimeCallMemory(call.ctx, {
    secret: VOICE_SECRET,
    seed: false,
    createNeuroLink: async () => ({
      recordConversationTurn: async (options: { turnId?: string }) => {
        stored.push(String(options.turnId));
        return { recorded: true, sessionId: "s", userId: "u" };
      },
      getConversationSeed: async () => [],
    }),
  } as Parameters<typeof setUpRealtimeCallMemory>[1]);
  expect(memory !== undefined, "no memory for a verified call");
  memory.recorder.userTranscript({ text: "run the lookup", final: true });
  memory.recorder.toolStart({ name: toolName as string, args: { q: 1 } });
  memory.recorder.toolEnd({ name: toolName as string, result: { ok: true } });
  memory.recorder.assistantMessage({
    id: `turn-${call.session}`,
    text: "Done.",
  });
  await memory.recorder.flush(2_000);
  await drain();
  return {
    spans: bySession(call.session),
    stored: stored.length,
    all: [...ingest.seen],
  };
}

const hostileName = {
  toString(): string {
    throw new Error("a tool name that cannot be stringified");
  },
};

await check(
  "X44",
  "control: an ordinary tool name gives a realtime-turn root, its generation and the tool span",
  async () => {
    const run = await realtimeTurnWithTool("get_sales");
    const names = run.all.map((s) => s.name);
    expect(names.includes("realtime-turn"), "no realtime-turn root");
    expect(names.includes("realtime"), "no realtime generation");
    expect(names.includes("get_sales"), "no tool span");
  },
);

await check(
  "X44",
  "a tool name that throws still ends and exports the realtime-turn root",
  async () => {
    const run = await realtimeTurnWithTool(hostileName);
    expect(
      run.all.some((s) => s.name === "realtime-turn"),
      "the realtime-turn root was never ended, so it was never exported",
    );
  },
);

await check(
  "X44",
  "a tool name that throws still ends and exports the realtime generation",
  async () => {
    const run = await realtimeTurnWithTool(hostileName);
    expect(
      run.all.some((s) => s.name === "realtime"),
      "the realtime generation was not exported",
    );
  },
);

await check(
  "X44",
  "a tool name that throws does not stop the turn from being stored",
  async () => {
    const run = await realtimeTurnWithTool(hostileName);
    expect(run.stored === 1, `${run.stored} turns stored`);
  },
);

// ---------------------------------------------------------------------------
// X08: withStreamSpan on a result without a usable stream
// ---------------------------------------------------------------------------

type SpyRecord = {
  ended: number;
  status?: { code: number; message?: string };
  attributes: Record<string, unknown>;
};

function spyTracer() {
  const records: SpyRecord[] = [];
  const tracer = {
    startSpan: () => {
      const record: SpyRecord = { ended: 0, attributes: {} };
      records.push(record);
      const span: Record<string, unknown> = {
        setAttribute: (key: string, value: unknown) => {
          record.attributes[key] = value;
          return span;
        },
        setAttributes: (values: Record<string, unknown>) => {
          Object.assign(record.attributes, values);
          return span;
        },
        setStatus: (status: SpyRecord["status"]) => {
          record.status = status;
          return span;
        },
        recordException: () => undefined,
        addEvent: () => span,
        updateName: () => span,
        end: () => {
          record.ended += 1;
        },
        isRecording: () => true,
        spanContext: () => ({ traceId: "0", spanId: "0", traceFlags: 0 }),
      };
      return span;
    },
  } as unknown as Parameters<typeof withStreamSpan>[0]["tracer"];
  return { tracer, records };
}

type StreamResult = { stream?: AsyncIterable<string> };

async function streamSpanOutcome(result: StreamResult, consume: boolean) {
  const { tracer, records } = spyTracer();
  let caught: unknown;
  try {
    const wrapped = await withStreamSpan<StreamResult, string>(
      { name: "provider.stream", tracer, detached: true },
      async () => result,
      (r) => r.stream as AsyncIterable<string>,
      (r, stream) => ({ ...r, stream }),
    );
    if (consume && wrapped.stream) {
      for await (const chunk of wrapped.stream) {
        void chunk;
      }
    }
  } catch (error) {
    caught = error;
  }
  return { record: records[0], caught };
}

async function* oneChunk(): AsyncIterable<string> {
  yield "a";
}

await check(
  "X08",
  "control: a result with a stream ends its span once, after the stream is consumed",
  async () => {
    const { record, caught } = await streamSpanOutcome(
      { stream: oneChunk() },
      true,
    );
    expect(caught === undefined, "the control stream failed");
    expect(record?.ended === 1, `the span ended ${record?.ended} times`);
  },
);

await check(
  "X08",
  "a result without a stream ends the span before the error reaches the caller",
  async () => {
    const { record, caught } = await streamSpanOutcome({}, false);
    expect(caught !== undefined, "the missing stream did not raise");
    expect(record?.ended === 1, `the span ended ${record?.ended} times`);
  },
);

await check(
  "X08",
  "a result without a stream marks the span as failed",
  async () => {
    const { record } = await streamSpanOutcome({}, false);
    expect(record?.status?.code === 2, "the span status is not ERROR");
    expect(
      record?.attributes["langfuse.observation.level"] === "ERROR",
      "the span carries no ERROR observation level",
    );
  },
);

await check(
  "X08",
  "an iterable whose asyncIterator throws ends the span once",
  async () => {
    const hostile: AsyncIterable<string> = {
      [Symbol.asyncIterator]: () => {
        throw new Error("no iterator");
      },
    };
    const { record, caught } = await streamSpanOutcome(
      { stream: hostile },
      false,
    );
    expect(caught !== undefined, "the hostile iterable did not raise");
    expect(record?.ended === 1, `the span ended ${record?.ended} times`);
  },
);

// ---------------------------------------------------------------------------
// X16, X17, X20: the SageMaker stream pump
// ---------------------------------------------------------------------------

const unhandled: string[] = [];
process.on("unhandledRejection", (reason) => {
  unhandled.push(reason instanceof Error ? reason.message : String(reason));
});

type StreamPart = Record<string, unknown> | Error;

function partsStream(parts: StreamPart[]) {
  return new ReadableStream({
    start(controller) {
      for (const part of parts) {
        if (part instanceof Error) {
          controller.error(part);
          return;
        }
        controller.enqueue(part);
      }
      controller.close();
    },
  });
}

async function sagemakerStream(parts: StreamPart[]) {
  ingest.reset();
  unhandled.length = 0;
  const provider = new AmazonSageMakerProvider(
    "m",
    "ep",
    "us-east-1",
    undefined,
    { accessKeyId: "a", secretAccessKey: "b" },
  );
  Reflect.set(provider, "sagemakerModel", {
    doStream: async () => ({ stream: partsStream(parts), warnings: [] }),
  });
  const doStream = Reflect.get(provider, "doStream") as (
    options: unknown,
  ) => Promise<{
    stream: AsyncIterable<{ content: string }>;
    finishReason: Promise<string>;
  }>;
  const result = await doStream.call(provider, { input: { text: "hi" } });
  let consumerError: string | undefined;
  try {
    for await (const chunk of result.stream) {
      void chunk;
    }
  } catch (error) {
    consumerError = error instanceof Error ? error.message : String(error);
  }
  const finish = await Promise.race([
    result.finishReason,
    pause(1_000).then(() => "settle-timeout"),
  ]);
  await drain();
  return {
    generations: ingest.seen.filter((s) => s.name === "stream"),
    unhandled: [...unhandled],
    consumerError,
    finish,
  };
}

const okParts: StreamPart[] = [
  { type: "text-delta", textDelta: "hi" },
  {
    type: "finish",
    finishReason: "stop",
    usage: { inputTokens: 1, outputTokens: 1 },
  },
];
const outOfSpecFinish: StreamPart[] = [
  { type: "text-delta", textDelta: "hi" },
  {
    type: "finish",
    finishReason: { unified: "stop" },
    usage: { inputTokens: 1, outputTokens: 1 },
  },
];
const failingStream: StreamPart[] = [
  { type: "text-delta", textDelta: "hi" },
  new Error("boom upstream"),
];

await check(
  "X16",
  "control: a normal SageMaker stream exports one ended generation and raises nothing",
  async () => {
    const run = await sagemakerStream(okParts);
    expect(
      run.generations.length === 1,
      `${run.generations.length} generations`,
    );
    expect(
      run.unhandled.length === 0,
      `unhandled: ${run.unhandled.join("; ")}`,
    );
  },
);

await check(
  "X16",
  "a throw while recording the generation still ends and exports the span",
  async () => {
    const run = await sagemakerStream(outOfSpecFinish);
    expect(
      run.generations.length === 1,
      `${run.generations.length} generation spans reached Langfuse; the span was never ended`,
    );
  },
);

await check(
  "X16",
  "a throw while recording the generation does not escape the detached pump",
  async () => {
    const run = await sagemakerStream(outOfSpecFinish);
    expect(
      run.unhandled.length === 0,
      `unhandled rejection: ${run.unhandled.join("; ")}`,
    );
  },
);

await check(
  "X17",
  "a stream that errors midway exports its generation at level ERROR with the message",
  async () => {
    const run = await sagemakerStream(failingStream);
    expect(run.consumerError === "boom upstream", "the consumer saw no error");
    const generation = run.generations[0];
    expect(generation !== undefined, "no generation reached Langfuse");
    expect(
      generation.attrs["langfuse.observation.level"] === "ERROR",
      `observation level is ${String(generation.attrs["langfuse.observation.level"])}`,
    );
    expect(
      text(generation, "langfuse.observation.status_message").includes(
        "boom upstream",
      ),
      "the status message does not carry the error",
    );
  },
);

await check(
  "X17",
  "a stream that errors midway records the exception on the generation",
  async () => {
    const run = await sagemakerStream(failingStream);
    const generation = run.generations[0];
    expect(generation !== undefined, "no generation reached Langfuse");
    expect(
      generation.events.some((event) => event.name === "exception"),
      "no exception event on the generation",
    );
  },
);

await check(
  "X20",
  "an observability failure in the pump leaves the caller's stream and promises unharmed and contained",
  async () => {
    const run = await sagemakerStream(outOfSpecFinish);
    expect(run.consumerError === undefined, "the consumer's stream failed");
    expect(run.finish !== "settle-timeout", "finishReason never settled");
    expect(
      run.unhandled.length === 0,
      `an observability error escaped: ${run.unhandled.join("; ")}`,
    );
  },
);

// ---------------------------------------------------------------------------
// X15: Vertex generate() content on infrastructure spans never reaches an exporter of ours
// ---------------------------------------------------------------------------

await check(
  "X15",
  "Vertex generate: provider.generate and executeGeneration carry observation content only while marked internal, so no exporter sends them",
  async () => {
    const run = await runChild("x15", {});
    const spans = run.spans as Array<{
      name: string;
      hasInput: boolean;
      hasOutput: boolean;
      type: string;
      internal: boolean;
    }>;
    expect(
      String(run.content).includes("vertex answer"),
      "the Vertex stand-in was not reached",
    );
    const infrastructure = spans.filter(
      (s) => s.name === "provider.generate" || s.name === "executeGeneration",
    );
    expect(infrastructure.length > 0, "the probe saw no infrastructure span");
    const carrying = infrastructure.filter(
      (s) => (s.hasInput || s.hasOutput) && !s.internal,
    );
    expect(
      carrying.length === 0,
      `carrying observation content without being internal: ${carrying.map((s) => s.name).join(", ")}`,
    );
  },
);

await check(
  "X15",
  "control: the real generation record still carries its input and output",
  async () => {
    const run = await runChild("x15", {});
    const spans = run.spans as Array<{
      name: string;
      hasInput: boolean;
      hasOutput: boolean;
      type: string;
    }>;
    const generation = spans.find(
      (s) => s.type === "generation" && s.hasInput && s.hasOutput,
    );
    expect(
      generation !== undefined,
      "no generation record with input and output",
    );
  },
);

// ---------------------------------------------------------------------------
// X02: a direct provider call has trace-level input and output
// ---------------------------------------------------------------------------

async function startOpenAI(): Promise<{
  baseURL: string;
  close: () => Promise<void>;
}> {
  const chunk = (delta: object, finish: string | null) =>
    `data: ${JSON.stringify({
      id: "c1",
      object: "chat.completion.chunk",
      created: 1,
      model: "gpt-4o-mini",
      choices: [{ index: 0, delta, finish_reason: finish }],
    })}\n\n`;
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}") as { stream?: boolean };
      if (body.stream === true) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write(chunk({ role: "assistant", content: "direct " }, null));
        res.write(chunk({ content: "answer" }, null));
        res.write(chunk({}, "stop"));
        res.write(
          `data: ${JSON.stringify({
            id: "c1",
            object: "chat.completion.chunk",
            created: 1,
            model: "gpt-4o-mini",
            choices: [],
            usage: {
              prompt_tokens: 12,
              completion_tokens: 5,
              total_tokens: 17,
            },
          })}\n\n`,
        );
        res.end("data: [DONE]\n\n");
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "c1",
          object: "chat.completion",
          created: 1,
          model: "gpt-4o-mini",
          choices: [
            {
              index: 0,
              finish_reason: "stop",
              message: { role: "assistant", content: "direct answer" },
            },
          ],
          usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 },
        }),
      );
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

const openai = await startOpenAI();
let directSequence = 0;

async function directProvider() {
  return AIProviderFactory.createProvider(
    "openai",
    "gpt-4o-mini",
    false,
    undefined,
    undefined,
    { openai: { apiKey: "k", baseURL: openai.baseURL } } as never,
  );
}

/** The spans of the one trace the direct call produced (the receiver is reset first). */
async function directCall(mode: "generate" | "stream", marker: string) {
  ingest.reset();
  const provider = await directProvider();
  if (mode === "generate") {
    await provider.generate({ input: { text: marker }, disableTools: true });
  } else {
    const result = await provider.stream({
      input: { text: marker },
      disableTools: true,
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
  }
  await drain();
  const generation = generationsOf(ingest.seen)[0];
  expect(generation !== undefined, "no generation record for the direct call");
  return traceOf(generation.traceId);
}

const traceInput = (spans: SeenSpan[]) =>
  spans.map((s) => text(s, "langfuse.trace.input")).filter((v) => v !== "");
const traceOutput = (spans: SeenSpan[]) =>
  spans.map((s) => text(s, "langfuse.trace.output")).filter((v) => v !== "");

for (const mode of ["generate", "stream"] as const) {
  directSequence += 1;
  const marker = `DIRECT-${mode.toUpperCase()}-${directSequence}`;
  const directTrace = await attempt(() => directCall(mode, marker));

  await check(
    "X02",
    `direct provider.${mode}: the trace carries the request as its trace-level input`,
    () => {
      const inputs = traceInput(valueOf(directTrace));
      expect(
        inputs.some((value) => value.includes(marker)),
        `trace-level input values: ${JSON.stringify(inputs)}`,
      );
    },
  );

  await check(
    "X02",
    `direct provider.${mode}: the trace carries the answer as its trace-level output`,
    () => {
      const outputs = traceOutput(valueOf(directTrace));
      expect(
        outputs.some((value) => value.includes("direct answer")),
        `trace-level output values: ${JSON.stringify(outputs)}`,
      );
    },
  );
}

const policyTrace = await attempt(() =>
  directCall("generate", "KEEP-POLICY-1 MASKME-POLICY-1"),
);

await check(
  "X02",
  "direct provider trace-level input goes through the configured mask",
  () => {
    const inputs = traceInput(valueOf(policyTrace));
    expect(
      inputs.some((value) => value.includes("KEEP-POLICY-1")),
      `trace-level input values: ${JSON.stringify(inputs)}`,
    );
    expect(
      inputs.every((value) => !value.includes("MASKME-POLICY-1")),
      "a masked token reached the trace-level input",
    );
  },
);

await check(
  "X02",
  "NEUROLINK_RECORD_INPUTS=false keeps the request out of the trace-level input, not the answer",
  async () => {
    process.env.NEUROLINK_RECORD_INPUTS = "false";
    try {
      const spans = await directCall("generate", "KEEP-OPTOUT-1");
      expect(
        traceOutput(spans).some((value) => value.includes("direct answer")),
        "the answer is not recorded as the trace-level output",
      );
      expect(
        traceInput(spans).length === 0,
        "the request was recorded as the trace-level input",
      );
    } finally {
      delete process.env.NEUROLINK_RECORD_INPUTS;
    }
  },
);

const nestedMarker = "NESTED-NEUROLINK-1";
const nestedTrace = await attempt(async () => {
  ingest.reset();
  const neurolink = new NeuroLink({
    credentials: { openai: { apiKey: "k", baseURL: openai.baseURL } },
  });
  await neurolink.generate({
    input: { text: nestedMarker },
    provider: "openai",
    model: "gpt-4o-mini",
    disableTools: true,
    disableInternalFallback: true,
  });
  await drain();
  const generation = generationsOf(ingest.seen).find((s) =>
    inputOf(s).includes(nestedMarker),
  );
  expect(
    generation !== undefined,
    "no generation record for the NeuroLink call",
  );
  return traceOf(generation.traceId);
});

await check(
  "X02",
  "control: under a NeuroLink turn only the turn writes trace-level input, the nested generation does not",
  () => {
    const spans = valueOf(nestedTrace);
    const writers = spans.filter((s) => text(s, "langfuse.trace.input") !== "");
    expect(writers.length >= 1, "the NeuroLink turn wrote no trace input");
    expect(
      writers.every((s) => observationType(s) !== "generation"),
      `a nested generation wrote trace-level input (${writers.map((s) => s.name).join(", ")})`,
    );
  },
);

// ---------------------------------------------------------------------------
// Close down
// ---------------------------------------------------------------------------

await openai.close();
await ingest.close();

console.log(failures === 0 ? "SUITE PASS" : `SUITE FAIL ${failures}`);
process.exit(failures === 0 ? 0 : 1);
