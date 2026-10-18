#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability, proxy and realtime defects an
 * adversarial verifier reproduced (BZ-6924 follow-up, packet adv-proxy), and
 * the backward-compatibility pass over the same area (packet bc-proxy)
 *
 * Every check prints exactly one line, `PROOF <id> PASS|FAIL <what is
 * checked>`, and the suite exits non-zero when any check fails.
 *
 *   Q01  upstream error text is recorded verbatim, with no credential
 *        replacement (proxy error, stream error event); the retry span is not
 *        an observation, so its error text never reaches Langfuse; the
 *        caller's mask and redactIO do not reach error text, as in the
 *        released build (see BP02)
 *   Q02  a translated request records no prompt or answer unless the flag is on
 *   Q03  request headers: only the names the released rule redacts read
 *        [REDACTED]; every other value, x-forwarded-authorization,
 *        cf-access-jwt-assertion, x-auth and the like included, is recorded
 *        verbatim (see BP01)
 *   Q04  a streamed Claude reply with no content is recorded as its parsed
 *        (empty) output, never as raw SSE text
 *   Q05  x-claude-code-session-id also sets neurolink.session_id
 *   Q06  realtime turn tracing never waits behind the memory store's writes
 *   Q07  the Codex output cap says when it dropped an item
 *   Q08  no metric label carries free error text
 *   V06  the proxy tracer's own NEUROLINK_RECORD_INPUTS check, the streamed
 *        output count and the delegated generation are each pinned here
 *
 *   BP01 header values are recorded as the release users run recorded them:
 *        names exactly, values verbatim, except what that release redacted
 *        (authorization, proxy-authorization, x-api-key, cookie, set-cookie
 *        and any name matching token|secret|key|password|credential); the
 *        credential-looking names outside that rule stay verbatim
 *   BP02 upstream error text is recorded by default again (verbatim, with
 *        only the pooled path's 180-character summary and the passthrough
 *        path's 500-character cut that already existed), and the caller's mask
 *        and redactIO leave it as recorded, as they did before the follow-up
 *   BP03 the translated path: only the prompt and answer are withheld by
 *        default (the maintainer's K17 opt-in); every other key is kept
 *   BP04 proxy metric names, units and label names are unchanged
 *   BP05 the Codex tap and the realtime tracer only add to what the release
 *        users run recorded; the differential run has no other defect;
 *        text the proxy writes itself, and the OpenAI/Gemini routes, keep
 *        what the release users run recorded
 *   BP06 NEUROLINK_PROXY_TRACE_BODY_LOGGING is exactly the string true
 *   BP07 the Codex output cap keeps the first-output timing observed
 *   BP08 the realtime tool callbacks accept the payload of the release users
 *        run, and tool calls pair with and without a call id
 *
 * DETERMINISM EXCEPTION (Critical Rule 15). This suite imports from `src/lib/`
 * and is on the `neurolink/e2e-tests-only` allow list. What it asserts cannot
 * come out of a live call: an upstream that answers 400 or 500 with a body that
 * echoes the prompt and a credential, a stream error event without a message, a
 * stream with no content block, a request header carrying a secret under an
 * unusual name, a Codex item over the 1 MiB cap, a transport error on the first
 * fetch only, a conversation store that never answers or answers in exactly
 * 400 ms, and the label values a MeterProvider receives. So the suite drives
 * the REAL proxy routes (`createProxyStartApp`), the REAL translated path (a
 * real `NeuroLink` against a local OpenAI-compatible server), the REAL Codex
 * usage tap, the REAL `createProxyFetch` and the REAL
 * `setUpRealtimeCallMemory` against recorded upstream replies behind a stubbed
 * `fetch`, a local Langfuse OTLP receiver that decodes what NeuroLink's own
 * exporter posts (mask included) and an in-memory metric reader on a real
 * `MeterProvider`. Everything is imported from `src`; nothing from `dist`.
 *
 * Offline: every server is on 127.0.0.1 and no key or provider is contacted.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-observability-adv-proxy.ts
 */
import "./helpers/credentialFreeEnv.js";
import "./helpers/proxyTestIsolation.js";
import type { JsonValue } from "../src/lib/types/common.js";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { metrics } from "@opentelemetry/api";
import { MeterProvider, MetricReader } from "@opentelemetry/sdk-metrics";

type Attr = string | number | boolean;
type SeenSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  attrs: Record<string, Attr>;
  events: Array<{ name: string; attrs: Record<string, Attr> }>;
  statusMessage?: string;
  receivedAt: number;
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
  status?: { message?: string };
};

// ---------------------------------------------------------------------------
// PROOF reporting
// ---------------------------------------------------------------------------

let failures = 0;

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
// A metric reader on a real MeterProvider, registered before any instrument
// ---------------------------------------------------------------------------

class ProofMetricReader extends MetricReader {
  protected async onForceFlush(): Promise<void> {}
  protected async onShutdown(): Promise<void> {}
}
const metricReader = new ProofMetricReader();
metrics.setGlobalMeterProvider(new MeterProvider({ readers: [metricReader] }));

type LabelledPoint = {
  metric: string;
  attributes: Record<string, unknown>;
};

async function collectPoints(): Promise<LabelledPoint[]> {
  const { resourceMetrics } = await metricReader.collect();
  return resourceMetrics.scopeMetrics.flatMap((scope) =>
    scope.metrics.flatMap((metric) =>
      metric.dataPoints.map((point) => ({
        metric: metric.descriptor.name,
        attributes: { ...point.attributes },
      })),
    ),
  );
}

// ---------------------------------------------------------------------------
// Local Langfuse OTLP receiver (decoded spans and the raw posts)
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
  raw: string[];
  reset: () => void;
  close: () => Promise<void>;
};

async function startIngest(): Promise<Ingest> {
  const seen: SeenSpan[] = [];
  const raw: string[] = [];
  const server: Server = createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        raw.push(text);
        try {
          const body = JSON.parse(text) as {
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
                  statusMessage: span.status?.message,
                  receivedAt: Date.now(),
                });
              }
            }
          }
        } catch {
          // A malformed post is simply not decoded; its raw text is kept.
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");
      });
    },
  );
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}`,
    seen,
    raw,
    reset: () => {
      seen.length = 0;
      raw.length = 0;
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
delete process.env.NEUROLINK_PROXY_TRACE_BODY_LOGGING;
delete process.env.NEUROLINK_RECORD_INPUTS;
delete process.env.NEUROLINK_TELEMETRY_ENABLED;

/** Masks every MASKME-* token; everything else stays readable. */
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
    // Nothing is delivered until a flush, so "delivered when shutdown returns"
    // measures the shutdown flush and not the batch timer.
    flushAt: 100,
    flushInterval: 600_000,
  },
});

const { createProxyStartApp } = await import("../src/cli/commands/proxy.js");
const { getProxyActivitySnapshot } =
  await import("../src/lib/proxy/proxyActivity.js");
const { tokenStore } = await import("../src/lib/auth/tokenStore.js");
const { initRequestLogger, flushRequestLogs } =
  await import("../src/lib/proxy/requestLogger.js");
const { flushProxyLifecycleEvents } =
  await import("../src/lib/proxy/proxyLifecycle.js");
const { NeuroLink } = await import("../src/lib/neurolink.js");
const { createCodexUsageTap } = await import("../src/lib/proxy/codexUsage.js");
const { createProxyFetch } = await import("../src/lib/proxy/proxyFetch.js");
const { recordFallbackAttempt } =
  await import("../src/lib/proxy/proxyTracer.js");
const { getExporterRegistry } =
  await import("../src/lib/observability/exporterRegistry.js");
const { LangfuseExporter } =
  await import("../src/lib/observability/exporters/langfuseExporter.js");
const { tracers } = await import("../src/lib/telemetry/tracers.js");
const { observe } = await import("../src/lib/telemetry/observation.js");
const { recordAIError } = await import("../src/lib/telemetry/aiMetrics.js");
const { setUpRealtimeCallMemory } =
  await import("../src/lib/voice/livekit/realtimeMemory.js");
const { signVoiceMemoryBinding } =
  await import("../src/lib/voice/livekit/memoryBinding.js");
initRequestLogger(false);

expect(
  getLangfuseHealthStatus().isHealthy,
  "Langfuse exporter did not start for the proof run",
);

/** Pushes buffered spans to the receiver until `ready` holds or time runs out. */
async function settle(
  ready: () => boolean = () => true,
  ms = 8_000,
): Promise<boolean> {
  const deadline = Date.now() + ms;
  do {
    await flushOpenTelemetry();
    if (ready()) {
      return true;
    }
    await pause(25);
  } while (Date.now() < deadline);
  return false;
}

const text = (s: SeenSpan | undefined, key: string): string =>
  s === undefined ? "" : String(s.attrs[key] ?? "");
const observationType = (s: SeenSpan) => text(s, "langfuse.observation.type");
const generationsOf = (spans: SeenSpan[]) =>
  spans.filter((s) => observationType(s) === "generation");
const inputOf = (s: SeenSpan | undefined) =>
  text(s, "langfuse.observation.input");
const outputOf = (s: SeenSpan | undefined) =>
  text(s, "langfuse.observation.output");
const rawHas = (needle: string) => ingest.raw.some((r) => r.includes(needle));
const rootFor = (session: string) =>
  ingest.seen.find(
    (s) => s.name === "proxy.request" && s.attrs["session.id"] === session,
  );
const traceOf = (traceId: string) =>
  ingest.seen.filter((s) => s.traceId === traceId);

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

/** Every place a needle shows up in the decoded spans, as `span:where:key`. */
function placesOf(spans: SeenSpan[], needle: string): string[] {
  const hits: string[] = [];
  for (const s of spans) {
    for (const [key, value] of Object.entries(s.attrs)) {
      if (String(value).includes(needle)) {
        hits.push(`${s.name}:attr:${key}`);
      }
    }
    for (const event of s.events) {
      for (const [key, value] of Object.entries(event.attrs)) {
        if (String(value).includes(needle)) {
          hits.push(`${s.name}:event:${event.name}:${key}`);
        }
      }
    }
    if (s.statusMessage?.includes(needle)) {
      hits.push(`${s.name}:status`);
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Upstream fixtures and the real proxy routes
// ---------------------------------------------------------------------------

const CLAUDE_MODEL = "claude-sonnet-4-6";

function sse(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify({ type: event, ...data })}\n\n`;
}

function messageStart(id: string, outputTokens = 1): string {
  return sse("message_start", {
    message: {
      id,
      type: "message",
      role: "assistant",
      model: CLAUDE_MODEL,
      content: [],
      usage: {
        input_tokens: 120,
        output_tokens: outputTokens,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
    },
  });
}

/** A complete streamed reply whose message_start already counts one output token. */
function claudeStream(answer: string): string {
  return (
    messageStart("msg_proof") +
    sse("content_block_start", {
      index: 0,
      content_block: { type: "text", text: "" },
    }) +
    sse("content_block_delta", {
      index: 0,
      delta: { type: "text_delta", text: answer },
    }) +
    sse("content_block_stop", { index: 0 }) +
    sse("message_delta", {
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: 30 },
    }) +
    sse("message_stop", {})
  );
}

function claudeJson(answer: string): string {
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

type Upstream = (url: URL, init?: RequestInit) => Response | Promise<Response>;
type ProxyOptions = Parameters<typeof createProxyStartApp>[0];

const CODEX_MODEL = "gpt-5.1-codex";

function codexFrame(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify({ type: event, ...data })}\n\n`;
}

function codexCompleted(answer: string): string {
  return codexFrame("response.completed", {
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

const codexRequest = (content: string) => ({
  model: CODEX_MODEL,
  stream: true,
  input: [
    {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: content }],
    },
  ],
});

const delegate = globalThis.fetch;
const ACCOUNT_KEY = "anthropic:proof@example.test";
const CODEX_ACCOUNT_KEY = "codex:proof@example.test";

/** Sends one request through the real Claude route and waits for it to finish. */
async function runProxy(args: {
  kind?: "claude" | "codex";
  /** Request path; the Claude or Codex path of `kind` by default. */
  path?: string;
  /** Read one chunk of the reply, then cancel it as a client that hangs up. */
  abortAfterFirstChunk?: boolean;
  upstream: Upstream;
  body: unknown;
  headers?: Record<string, string>;
  passthrough?: boolean;
  neurolink?: InstanceType<typeof NeuroLink>;
  modelRouter?: ProxyOptions["modelRouter"];
}): Promise<{ status: number; text: string }> {
  const accountKey = args.kind === "codex" ? CODEX_ACCOUNT_KEY : ACCOUNT_KEY;
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
      return args.upstream(url, init);
    }
    return delegate(input, init);
  };
  try {
    const { app } = await createProxyStartApp({
      neurolink: (args.neurolink ?? {
        getToolRegistry: () => ({}),
      }) as ProxyOptions["neurolink"],
      modelRouter: args.modelRouter,
      strategy: "fill-first",
      passthrough: args.passthrough ?? false,
      port: 0,
      host: "127.0.0.1",
      proxyConfig: null,
      primaryAccountKey: undefined,
      accountAllowlist: new Set([accountKey]),
    });
    const response = await app.request(
      `http://localhost${
        args.path ??
        (args.kind === "codex"
          ? "/backend-api/codex/responses"
          : "/v1/messages")
      }`,
      {
        method: "POST",
        headers: { "content-type": "application/json", ...args.headers },
        body: JSON.stringify(args.body),
      },
    );
    const status = response.status;
    let answered: string;
    if (args.abortAfterFirstChunk && response.body) {
      const reader = response.body.getReader();
      const first = await reader.read();
      await reader.cancel();
      answered = new TextDecoder().decode(first.value);
    } else {
      answered = await response.text();
    }
    const deadline = Date.now() + 4_000;
    while (
      getProxyActivitySnapshot().activeRequests > 0 &&
      Date.now() < deadline
    ) {
      await pause(5);
    }
    await flushRequestLogs();
    await flushProxyLifecycleEvents();
    return { status, text: answered };
  } finally {
    globalThis.fetch = delegate;
    await tokenStore.clearTokens(accountKey);
  }
}

/** Runs one request and returns the spans of its proxy.request trace. */
async function traced(
  session: string,
  args: Parameters<typeof runProxy>[0],
): Promise<{
  status: number;
  root: SeenSpan;
  spans: SeenSpan[];
  raw: string[];
}> {
  ingest.reset();
  const { status } = await runProxy({
    ...args,
    headers: { "x-neurolink-session-id": session, ...args.headers },
  });
  await settle(() => rootFor(session) !== undefined);
  const root = rootFor(session);
  expect(root !== undefined, "no proxy.request record reached Langfuse");
  await settle();
  return { status, root, spans: traceOf(root.traceId), raw: [...ingest.raw] };
}

async function underEnv<T>(
  env: Record<string, string | undefined>,
  run: () => Promise<T>,
): Promise<T> {
  const before: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    before[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    return await run();
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

const jsonError = (status: number, body: object) => () =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const streamReply = (body: string) => () =>
  new Response(body, { headers: { "content-type": "text/event-stream" } });

// A local OpenAI-compatible server for the translated path and its fallback.
async function startOpenAI(reply: "answer" | "error"): Promise<{
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
      if (reply === "error") {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            error: {
              message:
                "FALLBACKTEXT-LEAK the request echoed back: PROMPTTEXT-FB-ERR",
              type: "invalid_request_error",
              code: "bad_request",
            },
          }),
        );
        return;
      }
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(
        frame({ role: "assistant", content: "ANSWERTEXT-TRANSLATED " }, null),
      );
      res.write(frame({ content: "done" }, null));
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

const openai = await startOpenAI("answer");
const failingOpenai = await startOpenAI("error");
const translatedNeuroLink = new NeuroLink({
  credentials: { openai: { apiKey: "proof-key", baseURL: openai.baseURL } },
});
const translatedRouter: ProxyOptions["modelRouter"] = {
  resolve: () => ({ provider: "openai", model: "gpt-4o-mini" }),
  isClaudeTarget: () => false,
  getFallbackChain: () => [],
} as unknown as ProxyOptions["modelRouter"];
const fallbackRouter: ProxyOptions["modelRouter"] = {
  resolve: () => ({ provider: "anthropic", model: CLAUDE_MODEL }),
  isClaudeTarget: () => true,
  getFallbackChain: () => [{ provider: "openai", model: "gpt-4o-mini" }],
} as unknown as ProxyOptions["modelRouter"];

/** Runs a translated or fallback request and returns everything received. */
async function translatedRun(
  session: string,
  request: string,
  router: ProxyOptions["modelRouter"],
  upstream: Upstream = () => new Response("unexpected", { status: 599 }),
  neurolink: InstanceType<typeof NeuroLink> = translatedNeuroLink,
): Promise<{ status: number; root?: SeenSpan; spans: SeenSpan[] }> {
  ingest.reset();
  const { status } = await runProxy({
    neurolink,
    modelRouter: router,
    upstream,
    body: {
      model: CLAUDE_MODEL,
      stream: true,
      max_tokens: 64,
      messages: [{ role: "user", content: request }],
    },
    headers: { "x-neurolink-session-id": session, "x-neurolink-user-id": "u" },
  });
  await settle(() => rootFor(session) !== undefined);
  await settle(() => generationsOf(ingest.seen).length > 0);
  await settle();
  return { status, root: rootFor(session), spans: [...ingest.seen] };
}

// ---------------------------------------------------------------------------
// Q01: upstream error text
// ---------------------------------------------------------------------------

const pooled400 = await traced("s-q01-pooled", {
  upstream: jsonError(400, {
    type: "error",
    error: {
      type: "invalid_request_error",
      message: "echo: ERRTEXT-POOLED MASKME-ERR400",
    },
  }),
  body: {
    model: CLAUDE_MODEL,
    stream: false,
    max_tokens: 16,
    messages: [{ role: "user", content: "hello" }],
  },
}).catch((error: unknown) => error);

await check(
  "Q01",
  "pooled Claude 400, flag unset: the upstream error text is recorded on error.message and the status message as before the follow-up, outside the caller's mask, and the error type is recorded",
  () => {
    expect(
      !(pooled400 instanceof Error),
      `the scenario did not run: ${pooled400 instanceof Error ? pooled400.message : ""}`,
    );
    const { status, root, spans } = pooled400 as Awaited<
      ReturnType<typeof traced>
    >;
    expect(status === 400, "the proxy did not relay the 400");
    expect(text(root, "error.type") !== "", "no error.type on the root");
    const places = placesOf(spans, "ERRTEXT-POOLED");
    expect(
      places.includes("proxy.request:attr:error.message") &&
        places.includes(
          "proxy.request:attr:langfuse.observation.status_message",
        ),
      `upstream error text recorded at ${places.join(", ") || "nowhere"}`,
    );
    expect(rawHas("MASKME-ERR400"), "the caller's mask reached the error text");
  },
);

const passthrough500 = await traced("s-q01-passthrough", {
  passthrough: true,
  upstream: () =>
    new Response(
      `gateway echo of request: ERRTEXT-PT500 ${"x".repeat(40)} MASKME-PT500`,
      { status: 500, headers: { "content-type": "text/plain" } },
    ),
  body: {
    model: CLAUDE_MODEL,
    stream: false,
    max_tokens: 16,
    messages: [{ role: "user", content: "hello" }],
  },
  headers: { "x-api-key": "sk-ant-api03-callerkey" },
}).catch((error: unknown) => error);

await check(
  "Q01",
  "passthrough upstream 500, flag unset: the error body text is recorded on error.message and the status message as before the follow-up, outside the caller's mask",
  () => {
    expect(
      !(passthrough500 instanceof Error),
      `the scenario did not run: ${passthrough500 instanceof Error ? passthrough500.message : ""}`,
    );
    const { status, root, spans } = passthrough500 as Awaited<
      ReturnType<typeof traced>
    >;
    expect(status >= 500, "the proxy did not report the upstream failure");
    expect(text(root, "error.type") !== "", "no error.type on the root");
    const places = placesOf(spans, "ERRTEXT-PT500");
    expect(
      places.includes("proxy.request:attr:error.message") &&
        places.includes(
          "proxy.request:attr:langfuse.observation.status_message",
        ),
      `upstream error text recorded at ${places.join(", ") || "nowhere"}`,
    );
    expect(rawHas("MASKME-PT500"), "the caller's mask reached the error text");
  },
);

const streamError = await traced("s-q01-stream", {
  upstream: streamReply(
    messageStart("msg_err") +
      sse("content_block_start", {
        index: 0,
        content_block: { type: "text", text: "" },
      }) +
      sse("content_block_delta", {
        index: 0,
        delta: { type: "text_delta", text: "partial" },
      }) +
      `event: error\ndata: ${JSON.stringify({
        type: "error",
        detail: "upstream dump ERRTEXT-STREAM MASKME-STREAMERR",
      })}\n\n`,
  ),
  body: {
    model: CLAUDE_MODEL,
    stream: true,
    max_tokens: 16,
    messages: [{ role: "user", content: "hello" }],
  },
}).catch((error: unknown) => error);

await check(
  "Q01",
  "stream error event without a message field, flag unset: its payload is recorded on error.message as before the follow-up, outside the caller's mask",
  () => {
    expect(
      !(streamError instanceof Error),
      `the scenario did not run: ${streamError instanceof Error ? streamError.message : ""}`,
    );
    const { root, spans } = streamError as Awaited<ReturnType<typeof traced>>;
    expect(text(root, "error.type") !== "", "no error.type on the root");
    const places = placesOf(spans, "ERRTEXT-STREAM");
    expect(
      places.includes("proxy.request:attr:error.message"),
      `stream error payload recorded at ${places.join(", ") || "nowhere"}`,
    );
    expect(
      rawHas("MASKME-STREAMERR"),
      "the caller's mask reached the error text",
    );
  },
);

const BEARER_VALUE = "ERRBEARERTOKEN0123456789abcdef";
const KEY_VALUE = "ERRKEYVALUE0123456789";
const OPTED_IN_ERROR_TEXT = `READABLE-ERRTEXT rejected Authorization: Bearer ${BEARER_VALUE} api_key=${KEY_VALUE}`;
const optedInError = await underEnv(
  { NEUROLINK_PROXY_TRACE_BODY_LOGGING: "true" },
  () =>
    traced("s-q01-optin", {
      upstream: jsonError(400, {
        type: "error",
        error: {
          type: "invalid_request_error",
          message: OPTED_IN_ERROR_TEXT,
        },
      }),
      body: {
        model: CLAUDE_MODEL,
        stream: false,
        max_tokens: 16,
        messages: [{ role: "user", content: "hello" }],
      },
    }),
).catch((error: unknown) => error);

await check(
  "Q01",
  "flag set: error.message equals the raw upstream error text and the status message is '<type>: <raw text>', the bearer token and api_key value included (no replacement)",
  () => {
    expect(
      !(optedInError instanceof Error),
      `the scenario did not run: ${optedInError instanceof Error ? optedInError.message : ""}`,
    );
    expect(
      OPTED_IN_ERROR_TEXT.length <= 180,
      "the scenario text is longer than the pooled path's 180-character summary",
    );
    const { root } = optedInError as Awaited<ReturnType<typeof traced>>;
    const message = text(root, "error.message");
    const status = text(root, "langfuse.observation.status_message");
    expect(
      text(root, "error.type") === "invalid_request_error",
      "no error.type on the root",
    );
    expect(
      message === OPTED_IN_ERROR_TEXT,
      `error.message (${message.length} characters) differs from the raw upstream text (${OPTED_IN_ERROR_TEXT.length})`,
    );
    expect(
      status === `invalid_request_error: ${OPTED_IN_ERROR_TEXT}`,
      "the status message is not '<type>: <raw upstream text>'",
    );
  },
);

const RETRY_SECRET = "RETRYBEARERTOKEN0123456789abcdef";
const retrySpans = await (async () => {
  ingest.reset();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      throw new Error(
        `socket hang up READABLE-RETRYTEXT Authorization: Bearer ${RETRY_SECRET}`,
      );
    }
    return new Response("ok", { status: 200 });
  };
  try {
    const proxied = createProxyFetch();
    const response = await proxied("http://127.0.0.1:9/retry-proof");
    await response.text();
  } finally {
    globalThis.fetch = delegate;
  }
  // The retry span is a helper span, not an observation, so Langfuse does not
  // receive it (as before PR #2002). A real observation shows the pipeline
  // delivers, which makes the absence below mean something.
  const control = tracers.sdk.startSpan("q01-retry-control");
  observe(control, "span", {});
  control.end();
  await settle(() => ingest.seen.some((s) => s.name === "q01-retry-control"));
  return { calls, spans: [...ingest.seen] };
})().catch((error: unknown) => error);

await check(
  "Q01",
  "fetch retry event: the retry span is not an observation, so neither its event nor the bearer token in its error text reaches Langfuse",
  () => {
    expect(
      !(retrySpans instanceof Error),
      `the scenario did not run: ${retrySpans instanceof Error ? retrySpans.message : ""}`,
    );
    const { calls, spans } = retrySpans as { calls: number; spans: SeenSpan[] };
    expect(calls === 2, "the transient error was not retried");
    expect(
      spans.some((s) => s.name === "q01-retry-control"),
      "the control observation never reached Langfuse",
    );
    expect(
      !spans.some((s) => s.name === "http.fetchWithRetry") &&
        !spans
          .flatMap((s) => s.events)
          .some((e) => e.name === "http.request.retry"),
      "the retry span reached Langfuse although it is not an observation",
    );
    expect(
      !rawHas(RETRY_SECRET) && !rawHas("READABLE-RETRYTEXT"),
      "the transport error text reached the Langfuse wire",
    );
  },
);

// ---------------------------------------------------------------------------
// Q02: translated requests (and the translated fallback leg)
// ---------------------------------------------------------------------------

const translatedUnset = await translatedRun(
  "s-q02-unset",
  "PROMPTTEXT-TRANSLATED MASKME-TRANSLATED",
  translatedRouter,
).catch((error: unknown) => error);

await check(
  "Q02",
  "translated request, flag unset: neither the prompt nor the answer leaves the process",
  () => {
    expect(
      !(translatedUnset instanceof Error),
      `the scenario did not run: ${translatedUnset instanceof Error ? translatedUnset.message : ""}`,
    );
    const { spans } = translatedUnset as Awaited<
      ReturnType<typeof translatedRun>
    >;
    expect(generationsOf(spans).length > 0, "no generation reached Langfuse");
    const prompt = placesOf(spans, "PROMPTTEXT-TRANSLATED");
    const answer = placesOf(spans, "ANSWERTEXT-TRANSLATED");
    expect(
      prompt.length === 0 && !rawHas("PROMPTTEXT-TRANSLATED"),
      `the prompt was exported at ${prompt.join(", ") || "raw post"}`,
    );
    expect(
      answer.length === 0 && !rawHas("ANSWERTEXT-TRANSLATED"),
      `the answer was exported at ${answer.join(", ") || "raw post"}`,
    );
  },
);

await check(
  "Q02",
  "translated request, flag unset: the generation keeps its model, usage and cost",
  () => {
    expect(
      !(translatedUnset instanceof Error),
      `the scenario did not run: ${translatedUnset instanceof Error ? translatedUnset.message : ""}`,
    );
    const { spans } = translatedUnset as Awaited<
      ReturnType<typeof translatedRun>
    >;
    const generations = generationsOf(spans);
    expect(generations.length === 1, "the trace does not hold one generation");
    const usage = numbers(generations[0], "langfuse.observation.usage_details");
    expect(usage.input === 40 && usage.output === 8, "usage is wrong");
    const cost = numbers(generations[0], "langfuse.observation.cost_details");
    expect((cost.total ?? 0) > 0, "no cost on the generation");
    expect(
      text(generations[0], "langfuse.observation.model.name") !== "",
      "no model on the generation",
    );
  },
);

const translatedOptIn = await underEnv(
  { NEUROLINK_PROXY_TRACE_BODY_LOGGING: "true" },
  () =>
    translatedRun(
      "s-q02-optin",
      "PROMPTTEXT-TROPTIN MASKME-TROPTIN",
      translatedRouter,
    ),
).catch((error: unknown) => error);

await check(
  "Q02",
  "translated request, flag set: the generation records the prompt and the answer, masked; the raw request body event stays outside the mask, as in the released build",
  () => {
    expect(
      !(translatedOptIn instanceof Error),
      `the scenario did not run: ${translatedOptIn instanceof Error ? translatedOptIn.message : ""}`,
    );
    const { spans } = translatedOptIn as Awaited<
      ReturnType<typeof translatedRun>
    >;
    const generation = generationsOf(spans)[0];
    expect(generation !== undefined, "no generation reached Langfuse");
    expect(
      inputOf(generation).includes("PROMPTTEXT-TROPTIN"),
      "the generation lost the prompt",
    );
    expect(
      outputOf(generation).includes("ANSWERTEXT-TRANSLATED"),
      "the generation lost the answer",
    );
    expect(
      !inputOf(generation).includes("MASKME-TROPTIN") &&
        !outputOf(generation).includes("MASKME-TROPTIN"),
      "the generation records an unmasked token",
    );
    const unmasked = placesOf(spans, "MASKME-TROPTIN");
    expect(
      unmasked.length > 0 &&
        unmasked.every((place) => place.endsWith(":proxy.body")),
      `the token appears at ${unmasked.join(", ") || "nowhere"}, not only in the raw body event`,
    );
  },
);

const translatedNoInputs = await underEnv(
  {
    NEUROLINK_PROXY_TRACE_BODY_LOGGING: "true",
    NEUROLINK_RECORD_INPUTS: "false",
  },
  () => translatedRun("s-q02-noinputs", "PROMPTTEXT-TRNOIN", translatedRouter),
).catch((error: unknown) => error);

await check(
  "Q02",
  "translated request, flag set and NEUROLINK_RECORD_INPUTS=false: no prompt leaves the process, the answer is recorded",
  () => {
    expect(
      !(translatedNoInputs instanceof Error),
      `the scenario did not run: ${translatedNoInputs instanceof Error ? translatedNoInputs.message : ""}`,
    );
    const { spans } = translatedNoInputs as Awaited<
      ReturnType<typeof translatedRun>
    >;
    const generation = generationsOf(spans)[0];
    expect(generation !== undefined, "no generation reached Langfuse");
    expect(!rawHas("PROMPTTEXT-TRNOIN"), "the prompt left the process");
    expect(
      outputOf(generation).includes("ANSWERTEXT-TRANSLATED"),
      "the answer disappeared with the input opt-out",
    );
  },
);

// The fallback leg resolves its provider from the environment.
const fallbackEnv = (baseURL: string) => ({
  OPENAI_API_KEY: `sk-${"p".repeat(48)}`,
  OPENAI_BASE_URL: baseURL,
});
const claudeFails = jsonError(500, {
  type: "error",
  error: { type: "api_error", message: "upstream failed" },
});

const fallbackUnset = await underEnv(fallbackEnv(openai.baseURL), () =>
  translatedRun(
    "s-q02-fallback",
    "PROMPTTEXT-FALLBACK",
    fallbackRouter,
    claudeFails,
  ),
).catch((error: unknown) => error);

await check(
  "Q02",
  "translated fallback after a failed Claude attempt, flag unset: neither the prompt nor the answer leaves the process",
  () => {
    expect(
      !(fallbackUnset instanceof Error),
      `the scenario did not run: ${fallbackUnset instanceof Error ? fallbackUnset.message : ""}`,
    );
    const { spans } = fallbackUnset as Awaited<
      ReturnType<typeof translatedRun>
    >;
    expect(generationsOf(spans).length > 0, "no generation reached Langfuse");
    expect(!rawHas("PROMPTTEXT-FALLBACK"), "the prompt left the process");
    expect(!rawHas("ANSWERTEXT-TRANSLATED"), "the answer left the process");
  },
);

await check(
  "V06",
  "translated fallback after a failed Claude attempt: exactly one generation holds usage (the delegated call, not the proxy)",
  () => {
    expect(
      !(fallbackUnset instanceof Error),
      `the scenario did not run: ${fallbackUnset instanceof Error ? fallbackUnset.message : ""}`,
    );
    const { spans } = fallbackUnset as Awaited<
      ReturnType<typeof translatedRun>
    >;
    const generations = generationsOf(spans);
    expect(generations.length === 1, "the trace does not hold one generation");
    const usage = numbers(generations[0], "langfuse.observation.usage_details");
    expect(usage.input === 40 && usage.output === 8, "usage is wrong");
  },
);

// ---------------------------------------------------------------------------
// Q03: request headers
// ---------------------------------------------------------------------------

// The released rule, kept as the oracle for Q03 and BP01: fc892bbb5 redacted
// these names and recorded every other value verbatim, and the maintainer's
// decision is that the proxy tracer behaves exactly so.
const BASE_REDACTED_NAMES = new Set([
  "authorization",
  "proxy-authorization",
  "x-api-key",
  "cookie",
  "set-cookie",
]);
const BASE_REDACTED_PATTERN = /token|secret|key|password|credential/i;
const baseRedacts = (name: string): boolean =>
  BASE_REDACTED_NAMES.has(name.toLowerCase()) ||
  BASE_REDACTED_PATTERN.test(name.toLowerCase());

// Credential-looking names the released rule does not redact. An earlier
// version of this follow-up masked them; the maintainer decided it must not,
// so they are recorded as sent, and a return to masking them fails Q03 and
// BP01.
const RELEASE_VERBATIM_NAMES = [
  "cf-access-jwt-assertion",
  "x-auth",
  "x-authorization",
  "x-bearer",
  "x-forwarded-authorization",
  "x-hub-signature-256",
  "x-jwt",
  "x-neurolink-internal-request",
  "x-passwd",
  "x-resp-auth",
  "x-signature",
  "x_auth_id",
];

const HEADER_VERBATIM = {
  "x-forwarded-authorization": "Bearer HDRVERBATIM-FWDAUTH",
  "cf-access-jwt-assertion": "HDRVERBATIM-JWT",
  "x-auth": "HDRVERBATIM-XAUTH",
  "x-neurolink-internal-request": "HDRVERBATIM-INTERNAL",
};
const HEADER_REDACTED = {
  "x-access-token": "HDRREDACTED-TOKEN",
  "x-client-secret": "HDRREDACTED-SECRET",
};
const headerRun = await traced("s-q03-headers", {
  upstream: streamReply(claudeStream("ok")),
  body: {
    model: CLAUDE_MODEL,
    stream: true,
    max_tokens: 16,
    messages: [{ role: "user", content: "hi" }],
  },
  headers: {
    ...HEADER_VERBATIM,
    ...HEADER_REDACTED,
    "x-custom-header": "HDRREADABLE-CUSTOM",
    "anthropic-version": "2023-06-01",
    "user-agent": "claude-cli/9.9.9 (proof)",
  },
}).catch((error: unknown) => error);

await check(
  "Q03",
  "the redacted header set is exactly the released rule's: token- and secret-named headers read [REDACTED], and x-forwarded-authorization, cf-access-jwt-assertion, x-auth, x-neurolink-internal-request and the customer headers are recorded verbatim on the client and upstream header events",
  () => {
    expect(
      !(headerRun instanceof Error),
      `the scenario did not run: ${headerRun instanceof Error ? headerRun.message : ""}`,
    );
    expect(
      Object.keys(HEADER_VERBATIM).every((name) => !baseRedacts(name)) &&
        Object.keys(HEADER_REDACTED).every((name) => baseRedacts(name)),
      "the scenario headers do not split along the released rule",
    );
    const { root } = headerRun as Awaited<ReturnType<typeof traced>>;
    const headerEvent = (name: string): Record<string, string> => {
      const raw = String(
        root.events.find((e) => e.name === name)?.attrs["proxy.headers"] ?? "",
      );
      return raw === "" ? {} : (JSON.parse(raw) as Record<string, string>);
    };
    const client = headerEvent("proxy.client.request_headers");
    const upstream = headerEvent("proxy.upstream.request_headers");
    expect(Object.keys(client).length > 0, "no client request headers event");
    expect(
      Object.keys(upstream).length > 0,
      "no upstream request headers event",
    );
    expectBaseHeaders(client, undefined, "client request headers");
    expectBaseHeaders(upstream, undefined, "upstream request headers");
    for (const [name, value] of Object.entries(HEADER_VERBATIM)) {
      expect(client[name] === value, `${name} is not recorded as sent`);
      expect(
        !(name in upstream) || upstream[name] === value,
        `${name} is not recorded as sent upstream`,
      );
    }
    for (const name of Object.keys(HEADER_REDACTED)) {
      expect(client[name] === "[REDACTED]", `${name} is readable`);
    }
    const leaked = Object.values(HEADER_REDACTED).filter((value) =>
      rawHas(value),
    );
    expect(
      leaked.length === 0,
      `redacted values left the process: ${leaked.length}`,
    );
    expect(
      client["x-custom-header"] === "HDRREADABLE-CUSTOM" &&
        client["anthropic-version"] === "2023-06-01" &&
        client["user-agent"] === "claude-cli/9.9.9 (proof)",
      "header values that are not credentials are no longer readable",
    );
  },
);

// ---------------------------------------------------------------------------
// Q04: streamed replies with no content (flag on)
// ---------------------------------------------------------------------------

const emptyStream = await underEnv(
  { NEUROLINK_PROXY_TRACE_BODY_LOGGING: "true" },
  () =>
    traced("s-q04-empty", {
      upstream: streamReply(
        messageStart("m-empty") +
          sse("message_delta", {
            delta: { stop_reason: "end_turn" },
            usage: { output_tokens: 1 },
          }) +
          sse("message_stop", {}),
      ),
      body: {
        model: CLAUDE_MODEL,
        stream: true,
        max_tokens: 16,
        messages: [{ role: "user", content: "hi" }],
      },
    }),
).catch((error: unknown) => error);

const isRawSse = (output: string) =>
  output.includes("event:") || output.includes("message_start");

await check(
  "Q04",
  "flag on: a streamed reply with no content block is recorded as its parsed, empty output, not raw SSE text",
  () => {
    expect(
      !(emptyStream instanceof Error),
      `the scenario did not run: ${emptyStream instanceof Error ? emptyStream.message : ""}`,
    );
    const { root } = emptyStream as Awaited<ReturnType<typeof traced>>;
    const output = outputOf(root);
    expect(!isRawSse(output), "the root output is the raw SSE text");
    expect(output === "[]", "the root output is not the parsed empty list");
  },
);

const errorBeforeContent = await underEnv(
  { NEUROLINK_PROXY_TRACE_BODY_LOGGING: "true" },
  () =>
    traced("s-q04-error", {
      upstream: streamReply(
        messageStart("m-err") +
          `event: error\ndata: ${JSON.stringify({
            type: "error",
            error: { type: "overloaded_error", message: "Overloaded" },
          })}\n\n`,
      ),
      body: {
        model: CLAUDE_MODEL,
        stream: true,
        max_tokens: 16,
        messages: [{ role: "user", content: "hi" }],
      },
    }),
).catch((error: unknown) => error);

await check(
  "Q04",
  "flag on: a stream that errors before any content records the parsed output and the error, not raw SSE text",
  () => {
    expect(
      !(errorBeforeContent instanceof Error),
      `the scenario did not run: ${errorBeforeContent instanceof Error ? errorBeforeContent.message : ""}`,
    );
    const { root } = errorBeforeContent as Awaited<ReturnType<typeof traced>>;
    const output = outputOf(root);
    expect(!isRawSse(output), "the root output is the raw SSE text");
    expect(text(root, "error.type") !== "", "the error was not recorded");
  },
);

// ---------------------------------------------------------------------------
// Q05: the Claude Code session header, and V06 (M1) on the same reply
// ---------------------------------------------------------------------------

const claudeCodeSession = await (async () => {
  ingest.reset();
  await runProxy({
    upstream: streamReply(claudeStream("ok")),
    body: {
      model: CLAUDE_MODEL,
      stream: true,
      max_tokens: 16,
      messages: [{ role: "user", content: "hi" }],
    },
    headers: {
      "x-claude-code-session-id": "cc-session-77",
      "x-neurolink-user-id": "u-cc",
    },
  });
  await settle(() => rootFor("cc-session-77") !== undefined);
  const root = rootFor("cc-session-77");
  expect(root !== undefined, "no proxy.request record reached Langfuse");
  await settle(() => generationsOf(traceOf(root.traceId)).length > 0);
  return { root, spans: traceOf(root.traceId) };
})().catch((error: unknown) => error);

await check(
  "Q05",
  "a session taken from x-claude-code-session-id is also written as neurolink.session_id",
  () => {
    expect(
      !(claudeCodeSession instanceof Error),
      `the scenario did not run: ${claudeCodeSession instanceof Error ? claudeCodeSession.message : ""}`,
    );
    const { root } = claudeCodeSession as { root: SeenSpan };
    expect(
      root.attrs["session.id"] === "cc-session-77",
      "the Langfuse session is not the Claude Code session",
    );
    expect(
      root.attrs["neurolink.session_id"] === "cc-session-77",
      "no neurolink.session_id key",
    );
    expect(root.attrs["neurolink.user_id"] === "u-cc", "no user id key");
  },
);

await check(
  "V06",
  "streamed Claude reply: message_start's 1 output token and message_delta's cumulative 30 record 30, not 31",
  () => {
    expect(
      !(claudeCodeSession instanceof Error),
      `the scenario did not run: ${claudeCodeSession instanceof Error ? claudeCodeSession.message : ""}`,
    );
    const { spans } = claudeCodeSession as { spans: SeenSpan[] };
    const generation = generationsOf(spans)[0];
    expect(generation !== undefined, "no generation record");
    const usage = numbers(generation, "langfuse.observation.usage_details");
    expect(usage.output === 30, "the output count is not the stream's 30");
  },
);

// ---------------------------------------------------------------------------
// V06: the tracer's own NEUROLINK_RECORD_INPUTS check
// ---------------------------------------------------------------------------

const noInputs = await underEnv(
  {
    NEUROLINK_PROXY_TRACE_BODY_LOGGING: "true",
    NEUROLINK_RECORD_INPUTS: "false",
  },
  () =>
    traced("s-v06-noinputs", {
      upstream: () =>
        new Response(claudeJson("REPLYTEXT-V06"), {
          headers: { "content-type": "application/json" },
        }),
      body: {
        model: CLAUDE_MODEL,
        stream: false,
        max_tokens: 16,
        messages: [{ role: "user", content: "REQTEXT-V06" }],
      },
    }),
).catch((error: unknown) => error);

await check(
  "V06",
  "flag on and NEUROLINK_RECORD_INPUTS=false: the tracer's own request-body events carry no body and the request leaves nowhere",
  () => {
    expect(
      !(noInputs instanceof Error),
      `the scenario did not run: ${noInputs instanceof Error ? noInputs.message : ""}`,
    );
    const { root } = noInputs as Awaited<ReturnType<typeof traced>>;
    const bodyEvents = root.events.filter(
      (e) =>
        e.name === "proxy.client.request_body" ||
        e.name === "proxy.upstream.request_body",
    );
    expect(bodyEvents.length === 2, "the request body events are missing");
    expect(
      bodyEvents.every(
        (e) =>
          e.attrs["proxy.body.logged"] === false &&
          e.attrs["proxy.body"] === undefined,
      ),
      "a request body event carries the body",
    );
    expect(!rawHas("REQTEXT-V06"), "the request left the process");
    expect(
      outputOf(root).includes("REPLYTEXT-V06"),
      "the response disappeared with the input opt-out",
    );
  },
);

// ---------------------------------------------------------------------------
// Q06: realtime turn tracing and the memory store
// ---------------------------------------------------------------------------

const VOICE_SECRET = "proof-secret-with-more-than-sixteen-chars";
let voiceSequence = 0;

function voiceCall() {
  voiceSequence += 1;
  const room = `adv-room-${voiceSequence}`;
  const user = `adv-user-${voiceSequence}`;
  const session = `adv-session-${voiceSequence}`;
  const binding = signVoiceMemoryBinding({
    room,
    userId: user,
    sessionId: session,
    secret: VOICE_SECRET,
  });
  const metadata = Buffer.from(
    JSON.stringify({ authToken: "t", mcpContext: {}, memory: binding }),
  ).toString("base64");
  const callbacks: Array<() => Promise<void>> = [];
  const ctx = {
    room: { name: room, metadata },
    addShutdownCallback: (callback: () => Promise<void>) => {
      callbacks.push(callback);
    },
  } as unknown as Parameters<typeof setUpRealtimeCallMemory>[0];
  return { ctx, callbacks, session };
}

/** A conversation store whose n-th write behaves as `behaviour(n)` says. */
function store(behaviour: (n: number) => Promise<unknown>) {
  let writes = 0;
  return {
    secret: VOICE_SECRET,
    seed: false as const,
    createNeuroLink: async () => ({
      recordConversationTurn: async () => {
        writes += 1;
        await behaviour(writes);
        return { recorded: true, sessionId: "s", userId: "u" };
      },
      getConversationSeed: async () => [],
    }),
  };
}

const realtimeTurns = (session: string) =>
  ingest.seen.filter(
    (s) => s.name === "realtime-turn" && s.attrs["session.id"] === session,
  );

await check(
  "Q06",
  "realtime: a store whose first write never answers does not stop the later turns from being traced",
  async () => {
    ingest.reset();
    const call = voiceCall();
    const memory = await setUpRealtimeCallMemory(call.ctx, {
      ...store((n) => (n === 1 ? new Promise(() => {}) : Promise.resolve())),
      flushBudgetMs: 500,
    });
    expect(memory !== undefined, "no memory for a verified call");
    for (let i = 1; i <= 3; i++) {
      memory.recorder.userTranscript({ text: `q${i}`, final: true });
      memory.recorder.assistantMessage({ id: `stall-${i}`, text: `a${i}` });
    }
    await pause(200);
    const startedAt = Date.now();
    for (const callback of call.callbacks) {
      await callback();
    }
    const shutdownMs = Date.now() - startedAt;
    await settle(() => realtimeTurns(call.session).length >= 3, 3_000);
    expect(
      realtimeTurns(call.session).length === 3,
      `${realtimeTurns(call.session).length} of 3 turns were traced`,
    );
    expect(shutdownMs < 1_000, "shutdown waited past the flush budget");
  },
);

await check(
  "Q06",
  "realtime: with 400 ms store writes and a 600 ms budget, every turn is delivered when the shutdown callback returns",
  async () => {
    ingest.reset();
    const call = voiceCall();
    const memory = await setUpRealtimeCallMemory(call.ctx, {
      ...store(() => pause(400)),
      flushBudgetMs: 600,
    });
    expect(memory !== undefined, "no memory for a verified call");
    for (let i = 1; i <= 3; i++) {
      memory.recorder.userTranscript({ text: `q${i}`, final: true });
      memory.recorder.assistantMessage({ id: `slow-${i}`, text: `a${i}` });
    }
    await pause(100);
    for (const callback of call.callbacks) {
      await callback();
    }
    const delivered = realtimeTurns(call.session).length;
    await settle(() => realtimeTurns(call.session).length >= 3, 3_000);
    expect(delivered === 3, `${delivered} of 3 turns delivered at return`);
  },
);

await check(
  "Q06",
  "realtime: when the store never answers, shutdown sends the turn it closes at once, not after the write budget runs out",
  async () => {
    ingest.reset();
    const call = voiceCall();
    const budgetMs = 1_500;
    const memory = await setUpRealtimeCallMemory(call.ctx, {
      ...store(() => new Promise(() => {})),
      flushBudgetMs: budgetMs,
    });
    expect(memory !== undefined, "no memory for a verified call");
    memory.recorder.userTranscript({ text: "last words", final: true });
    memory.recorder.assistantDelta("cut off");
    const startedAt = Date.now();
    for (const callback of call.callbacks) {
      await callback();
    }
    const elapsed = Date.now() - startedAt;
    await settle(() => realtimeTurns(call.session).length >= 1, 3_000);
    const turn = realtimeTurns(call.session)[0];
    expect(turn !== undefined, "the closing turn was never traced");
    expect(
      turn.receivedAt - startedAt < budgetMs / 2,
      `the closing turn arrived ${turn.receivedAt - startedAt} ms into a ${budgetMs} ms shutdown`,
    );
    expect(elapsed < budgetMs + 1_000, "shutdown waited past the flush budget");
  },
);

await check(
  "Q06",
  "realtime: turns are traced in the order they closed",
  async () => {
    ingest.reset();
    const call = voiceCall();
    const memory = await setUpRealtimeCallMemory(call.ctx, {
      ...store(() => pause(50)),
      flushBudgetMs: 800,
    });
    expect(memory !== undefined, "no memory for a verified call");
    for (let i = 1; i <= 3; i++) {
      memory.recorder.userTranscript({ text: `order-q${i}`, final: true });
      memory.recorder.assistantMessage({ id: `order-${i}`, text: `a${i}` });
    }
    for (const callback of call.callbacks) {
      await callback();
    }
    await settle(() => realtimeTurns(call.session).length >= 3, 3_000);
    const order = realtimeTurns(call.session).map((s) => inputOf(s));
    expect(order.length === 3, "not every turn was traced");
    expect(
      order.every((input, index) => input.includes(`order-q${index + 1}`)),
      "the turns were not traced in order",
    );
  },
);

// ---------------------------------------------------------------------------
// Q07: the Codex output cap
// ---------------------------------------------------------------------------

await check(
  "Q07",
  "Codex tap: an output item over the cap leaves a marker in its place, later items keep their order, and outputItemsOmitted is set",
  async () => {
    const tap = createCodexUsageTap();
    const frame = (type: string, data: object) =>
      `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
    const usage = {
      input_tokens: 5,
      output_tokens: 3,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens_details: { reasoning_tokens: 0 },
    };
    const stream =
      frame("response.output_item.done", {
        item: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "B".repeat(1_100_000) }],
        },
      }) +
      frame("response.output_item.done", {
        item: { type: "function_call", name: "lookup", arguments: "{}" },
      }) +
      frame("response.completed", { response: { id: "r", output: [], usage } });
    const bytes = Buffer.from(stream, "utf8");
    const reader = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 65_536) {
          controller.enqueue(bytes.subarray(i, i + 65_536));
        }
        controller.close();
      },
    })
      .pipeThrough(tap.stream)
      .getReader();
    for (;;) {
      const { done } = await reader.read();
      if (done) {
        break;
      }
    }
    await tap.usage;
    const evidence = tap.evidence();
    const output = (evidence.response?.output ?? []) as Array<
      Record<string, unknown>
    >;
    expect(output.length === 2, `${output.length} items recorded, not 2`);
    expect(
      output[1]?.type === "function_call",
      "the later item is not kept in its place",
    );
    expect(
      output[0]?.type !== "message" &&
        /truncat|omit/i.test(JSON.stringify(output[0] ?? {})),
      "the dropped item left no marker",
    );
    expect(
      evidence.outputItemsOmitted === true,
      "outputItemsOmitted is not set",
    );
  },
);

// ---------------------------------------------------------------------------
// Q08: metric labels
// ---------------------------------------------------------------------------

// The fallback leg runs on the instance's credentials, so this one points at
// the server that refuses with a body echoing the prompt.
const failingNeuroLink = new NeuroLink({
  credentials: {
    openai: { apiKey: "proof-key", baseURL: failingOpenai.baseURL },
  },
});
const failingFallback = await underEnv(fallbackEnv(failingOpenai.baseURL), () =>
  translatedRun(
    "s-q08-fallback",
    "PROMPTTEXT-Q08",
    fallbackRouter,
    claudeFails,
    failingNeuroLink,
  ),
).catch((error: unknown) => error);

await underEnv({ NEUROLINK_TELEMETRY_ENABLED: "true" }, async () => {
  recordAIError(
    "openai",
    new Error("AIERRTEXT-LEAK echo of the prompt api_key=AIERRKEYVALUE"),
  );
});

const points = await collectPoints().catch((error: unknown) => error);

await check(
  "Q08",
  "no metric label carries free error text: proxy_fallback_failure_total (real failing fallback leg) and ai_provider_errors_total record bounded values",
  () => {
    expect(!(failingFallback instanceof Error), "the fallback did not run");
    expect(!(points instanceof Error), "the metric reader could not collect");
    const all = points as LabelledPoint[];
    expect(
      all.some((p) => p.metric === "proxy_fallback_failure_total"),
      "the failing fallback recorded no proxy_fallback_failure_total point",
    );
    expect(
      all.some((p) => p.metric === "ai_provider_errors_total"),
      "recordAIError recorded no ai_provider_errors_total point",
    );
    const offending = all.flatMap((p) =>
      Object.entries(p.attributes)
        .filter(([, value]) =>
          /FALLBACKTEXT|PROMPTTEXT|AIERRTEXT|AIERRKEYVALUE/.test(String(value)),
        )
        .map(([label]) => `${p.metric}{${label}}`),
    );
    expect(
      offending.length === 0,
      `free text in labels: ${[...new Set(offending)].join(", ")}`,
    );
  },
);

/** Feeds SSE frames through the real Codex usage tap and returns its evidence. */
async function tapEvidence(frames: string[]) {
  const tap = createCodexUsageTap();
  const bytes = Buffer.from(frames.join(""), "utf8");
  const reader = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  })
    .pipeThrough(tap.stream)
    .getReader();
  for (;;) {
    const { done } = await reader.read();
    if (done) {
      break;
    }
  }
  await tap.usage;
  return tap.evidence();
}

// ---------------------------------------------------------------------------
// BP01: header values are recorded as the release users run recorded them
// ---------------------------------------------------------------------------

// The released rule is the oracle (defined above Q03): the header names it
// redacts read [REDACTED], and every other value is recorded as sent.

const REQUEST_HEADER_TABLE: Record<string, string> = {
  // browser
  accept: "application/json",
  "accept-encoding": "gzip, br",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  "content-type": "application/json",
  dnt: "1",
  origin: "https://console.example.test",
  pragma: "no-cache",
  referer: "https://console.example.test/chat?id=42",
  "sec-ch-ua": '"Chromium";v="120"',
  "sec-fetch-mode": "cors",
  "user-agent": "claude-cli/2.1.0 (external, cli)",
  "x-requested-with": "XMLHttpRequest",
  // CDN and proxies
  "cf-connecting-ip": "203.0.113.7",
  "cf-ipcountry": "IN",
  "cf-ray": "8a1b2c3d4e5f-BOM",
  "cf-visitor": '{"scheme":"https"}',
  forwarded: "for=203.0.113.7;proto=https",
  via: "1.1 edge-proxy",
  "x-forwarded-for": "198.51.100.23, 10.0.0.4",
  "x-forwarded-host": "api.example.test",
  "x-forwarded-port": "443",
  "x-forwarded-proto": "https",
  "x-real-ip": "198.51.100.23",
  "x-request-start": "t=1700000000.123",
  // Anthropic, OpenAI, Codex and the SDKs
  "anthropic-beta": "claude-code-20250219,oauth-2025-04-20",
  "anthropic-dangerous-direct-browser-access": "true",
  "anthropic-version": "2023-06-01",
  "x-app": "cli",
  "x-stainless-arch": "arm64",
  "x-stainless-lang": "js",
  "x-stainless-os": "MacOS",
  "x-stainless-package-version": "0.60.0",
  "x-stainless-retry-count": "0",
  "x-stainless-runtime": "node",
  "x-stainless-runtime-version": "v22.0.0",
  "x-stainless-timeout": "600",
  "openai-beta": "responses=experimental",
  originator: "codex_cli_rs",
  version: "0.46.0",
  // NeuroLink and Claude Code identity
  "x-claude-code-session-id": "cc-session-bp01",
  "x-neurolink-conversation-id": "conv-bp01",
  "x-neurolink-session-id": "s-bp01-headers",
  "x-neurolink-user-id": "user-bp01",
  // customer-defined
  "x-author-name": "Sachin",
  "x-author-team": "platform",
  "x-authority": "gateway.example.test",
  "x-authenticated-user": "svc-batch",
  "x-client-name": "proof-client",
  "x-client-version": "9.9.9",
  "x-correlation-id": "corr-7f3a",
  "x-customer-id": "cust-1138",
  "x-datadog-trace-id": "1234567890",
  "x-deployment": "blue",
  "x-env": "staging",
  "x-idempotency-id": "idem-0001",
  "x-request-id": "req-0001",
  "x-session-affinity": "node-3",
  "x-team": "growth",
  "x-tenant": "tenant-9",
  "x-trace-id": "trace-abc",
  "x-workspace": "ws-12",
  // credential-bearing, redacted by the release users run
  authorization: "Bearer BP01-AUTHORIZATION-VALUE",
  "proxy-authorization": "Basic BP01-PROXYAUTH-VALUE",
  "x-api-key": "BP01-API-KEY-VALUE",
  cookie: "sid=BP01-COOKIE-VALUE",
  "x-access-token": "BP01-ACCESS-TOKEN-VALUE",
  "x-csrf-token": "BP01-CSRF-VALUE",
  "x-client-secret": "BP01-CLIENT-SECRET-VALUE",
  "x-signing-key": "BP01-SIGNING-KEY-VALUE",
  "x-idempotency-key": "BP01-IDEMPOTENCY-VALUE",
  "x-db-password": "BP01-PASSWORD-VALUE",
  "x-service-credential": "BP01-CREDENTIAL-VALUE",
  "x-amz-security-token": "BP01-AMZ-SECURITY-VALUE",
  "x-goog-api-key": "BP01-GOOG-KEY-VALUE",
  // credential-looking names the released rule does not redact: verbatim
  "x-forwarded-authorization": "Bearer BP01-FWD-AUTH-VALUE",
  "cf-access-jwt-assertion": "BP01-JWT-ASSERTION-VALUE",
  "x-auth": "BP01-XAUTH-VALUE",
  "x-authorization": "BP01-XAUTHORIZATION-VALUE",
  "x-jwt": "BP01-XJWT-VALUE",
  "x-bearer": "BP01-XBEARER-VALUE",
  "x-signature": "BP01-SIGNATURE-VALUE",
  "x-hub-signature-256": "sha256=BP01-HUB-SIGNATURE-VALUE",
  "x-passwd": "BP01-PASSWD-VALUE",
  x_auth_id: "BP01-UNDERSCORE-AUTH-VALUE",
  "x-neurolink-internal-request": "BP01-INTERNAL-VALUE",
  // rate-limit names the release users run redacted because they say "tokens"
  "anthropic-ratelimit-tokens-limit": "80000",
  "x-ratelimit-limit-tokens": "80000",
};

const RESPONSE_HEADER_TABLE: Record<string, string> = {
  "anthropic-ratelimit-requests-limit": "1000",
  "anthropic-ratelimit-requests-remaining": "999",
  "anthropic-ratelimit-requests-reset": "2026-01-01T00:00:00Z",
  "anthropic-ratelimit-tokens-limit": "80000",
  "anthropic-ratelimit-input-tokens-remaining": "70000",
  "cache-control": "no-store",
  "cf-ray": "9z9y8x7w-BOM",
  date: "Sun, 18 Oct 2026 04:00:00 GMT",
  "request-id": "req_011CZ",
  "retry-after": "2",
  server: "cloudflare",
  "set-cookie": "__cf_bm=BP01-RESP-COOKIE-VALUE; path=/",
  "strict-transport-security": "max-age=31536000",
  vary: "Accept-Encoding",
  via: "1.1 google",
  "x-envoy-upstream-service-time": "431",
  "x-powered-by": "express",
  "x-ratelimit-remaining-requests": "58",
  "x-request-id": "req-resp-1",
  "x-should-retry": "false",
  "x-trace-id": "resp-trace-1",
  "x-codex-primary-used-percent": "3",
  "x-resp-token": "BP01-RESP-TOKEN-VALUE",
  "x-resp-auth": "BP01-RESP-AUTH-VALUE",
  "x-author-resp": "resp-author",
};

/** The `proxy.headers` object of the first root event with this name. */
function headerEvent(root: SeenSpan, name: string): Record<string, string> {
  const event = root.events.find((e) => e.name === name);
  expect(event !== undefined, `no ${name} event on the root`);
  return JSON.parse(String(event.attrs["proxy.headers"] ?? "{}")) as Record<
    string,
    string
  >;
}

/**
 * The redacted set is exactly the released rule's: a name reads [REDACTED] if
 * and only if the oracle redacts it, so a header outside the rule that is
 * hidden fails as surely as a header inside it that is readable. When the
 * sent headers are known, every other value equals what was sent, and each
 * credential-looking name outside the rule (RELEASE_VERBATIM_NAMES) that was
 * sent is recorded as sent.
 */
function expectBaseHeaders(
  recorded: Record<string, string>,
  sent: Record<string, string> | undefined,
  label: string,
): void {
  const names = Object.keys(recorded);
  const differing = names
    .filter((name) => (recorded[name] === "[REDACTED]") !== baseRedacts(name))
    .sort();
  expect(
    differing.length === 0,
    `${label}: the redacted set differs from the released rule for [${differing.join(", ")}]`,
  );
  if (sent !== undefined) {
    const changed = names.filter(
      (name) =>
        recorded[name] !== "[REDACTED]" && recorded[name] !== sent[name],
    );
    expect(
      changed.length === 0,
      `${label}: values not recorded verbatim for [${changed.join(", ")}]`,
    );
    const notVerbatim = RELEASE_VERBATIM_NAMES.filter(
      (name) => name in sent && recorded[name] !== sent[name],
    );
    expect(
      notVerbatim.length === 0,
      `${label}: not recorded as sent for [${notVerbatim.join(", ")}]`,
    );
  }
}

const bp01Claude = await traced("s-bp01-headers", {
  upstream: () =>
    new Response(claudeJson("ok"), {
      headers: { "content-type": "application/json", ...RESPONSE_HEADER_TABLE },
    }),
  body: {
    model: CLAUDE_MODEL,
    stream: false,
    max_tokens: 16,
    messages: [{ role: "user", content: "hi" }],
  },
  headers: REQUEST_HEADER_TABLE,
}).catch((error: unknown) => error);

await check(
  "BP01",
  "Claude client request headers (>= 60 names): the redacted set is exactly the released rule's and every other value, the credential-looking names outside it included, is verbatim",
  () => {
    expect(
      !(bp01Claude instanceof Error),
      `the scenario did not run: ${bp01Claude instanceof Error ? bp01Claude.message : ""}`,
    );
    const { root } = bp01Claude as Awaited<ReturnType<typeof traced>>;
    const recorded = headerEvent(root, "proxy.client.request_headers");
    expect(
      Object.keys(recorded).length >= 60,
      `only ${Object.keys(recorded).length} header names recorded`,
    );
    const missing = Object.keys(REQUEST_HEADER_TABLE).filter(
      (name) => !(name in recorded),
    );
    expect(
      missing.length === 0,
      `header names not recorded: ${missing.join(", ")}`,
    );
    expectBaseHeaders(recorded, REQUEST_HEADER_TABLE, "client request headers");
  },
);

await check(
  "BP01",
  "Claude client request headers: customer headers, forwarding headers, the session ids and x-forwarded-authorization, cf-access-jwt-assertion, x-auth, x-authorization, x-bearer, x-jwt, x-passwd, x-signature, x-hub-signature-256, x_auth_id and x-neurolink-internal-request are recorded as sent; the values under redacted names do not leave the process",
  () => {
    expect(
      !(bp01Claude instanceof Error),
      `the scenario did not run: ${bp01Claude instanceof Error ? bp01Claude.message : ""}`,
    );
    const { root } = bp01Claude as Awaited<ReturnType<typeof traced>>;
    const recorded = headerEvent(root, "proxy.client.request_headers");
    for (const name of [
      "host",
      "x-forwarded-for",
      "x-real-ip",
      "origin",
      "referer",
      "x-trace-id",
      "x-correlation-id",
      "x-author-name",
      "x-authority",
      "x-authenticated-user",
      "x-claude-code-session-id",
      "x-neurolink-session-id",
      "x-customer-id",
    ]) {
      if (name in REQUEST_HEADER_TABLE) {
        expect(
          recorded[name] === REQUEST_HEADER_TABLE[name],
          `${name} is not readable`,
        );
      }
    }
    // x-resp-auth is the one name of the list that only a response carries.
    const requestVerbatim = RELEASE_VERBATIM_NAMES.filter(
      (name) => name in REQUEST_HEADER_TABLE,
    );
    expect(
      requestVerbatim.length === RELEASE_VERBATIM_NAMES.length - 1,
      `the request table holds ${requestVerbatim.length} of the verbatim names`,
    );
    const verbatim = requestVerbatim.filter(
      (name) => recorded[name] !== REQUEST_HEADER_TABLE[name],
    );
    expect(
      verbatim.length === 0,
      `not recorded as sent: ${verbatim.join(", ")}`,
    );
    const { raw } = bp01Claude as Awaited<ReturnType<typeof traced>>;
    const redactedEntries = Object.entries(REQUEST_HEADER_TABLE).filter(
      ([name, value]) => baseRedacts(name) && value.includes("BP01-"),
    );
    expect(
      redactedEntries.length >= 10,
      `only ${redactedEntries.length} redacted credential values in the table`,
    );
    const leaked = redactedEntries
      .map(([name, value]) => ({
        name,
        secret: value.replace(/^(Bearer |Basic |sha256=)/, ""),
      }))
      .filter(({ secret }) => raw.some((post) => post.includes(secret)))
      .map(({ name }) => name);
    expect(
      leaked.length === 0,
      `values under redacted names exported: ${leaked.join(", ")}`,
    );
  },
);

await check(
  "BP01",
  "Claude upstream request headers: the names the proxy forwards follow the same released rule (redacted set exact, other values verbatim)",
  () => {
    expect(
      !(bp01Claude instanceof Error),
      `the scenario did not run: ${bp01Claude instanceof Error ? bp01Claude.message : ""}`,
    );
    const { root } = bp01Claude as Awaited<ReturnType<typeof traced>>;
    const recorded = headerEvent(root, "proxy.upstream.request_headers");
    expect(
      Object.keys(recorded).length >= 8,
      `only ${Object.keys(recorded).length} upstream header names recorded`,
    );
    expectBaseHeaders(recorded, undefined, "upstream request headers");
  },
);

await check(
  "BP01",
  "upstream response headers: the redacted set is exactly the released rule's (set-cookie and every name that says token), the rest are verbatim, x-resp-auth and the request rate-limit counters included",
  () => {
    expect(
      !(bp01Claude instanceof Error),
      `the scenario did not run: ${bp01Claude instanceof Error ? bp01Claude.message : ""}`,
    );
    const { root } = bp01Claude as Awaited<ReturnType<typeof traced>>;
    const recorded = headerEvent(root, "proxy.upstream.response_headers");
    expect(
      Object.keys(recorded).length >= 20,
      `only ${Object.keys(recorded).length} response header names recorded`,
    );
    const expected: Record<string, string> = {
      "content-type": "application/json",
      ...RESPONSE_HEADER_TABLE,
    };
    expectBaseHeaders(recorded, expected, "upstream response headers");
    expect(
      recorded["anthropic-ratelimit-requests-remaining"] === "999" &&
        recorded["x-powered-by"] === "express",
      "response header values are not readable",
    );
  },
);

// The passthrough route only forwards a caller key that looks like one, and
// `traced` finds the request by its session header.
const passthroughHeaders = {
  ...REQUEST_HEADER_TABLE,
  "x-api-key": "sk-ant-api03-callerkey",
  "x-neurolink-session-id": "s-bp01-headers-pt",
};
const bp01Passthrough = await traced("s-bp01-headers-pt", {
  passthrough: true,
  upstream: () =>
    new Response(claudeJson("ok"), {
      headers: { "content-type": "application/json" },
    }),
  body: {
    model: CLAUDE_MODEL,
    stream: false,
    max_tokens: 16,
    messages: [{ role: "user", content: "hi" }],
  },
  headers: passthroughHeaders,
}).catch((error: unknown) => error);

await check(
  "BP01",
  "passthrough route: client request headers follow the same released rule (redacted set exact, other values verbatim)",
  () => {
    expect(
      !(bp01Passthrough instanceof Error),
      `the scenario did not run: ${bp01Passthrough instanceof Error ? bp01Passthrough.message : ""}`,
    );
    const { root } = bp01Passthrough as Awaited<ReturnType<typeof traced>>;
    const recorded = headerEvent(root, "proxy.client.request_headers");
    expect(Object.keys(recorded).length >= 60, "fewer than 60 names recorded");
    expectBaseHeaders(recorded, passthroughHeaders, "passthrough headers");
  },
);

// ---------------------------------------------------------------------------
// BP02: upstream error text is recorded by default, as before the follow-up
// ---------------------------------------------------------------------------

/** Runs `run` with Langfuse exporting through an exporter built from `options`. */
async function withLangfuseExporter<T>(
  options: Record<string, unknown>,
  run: () => Promise<T>,
): Promise<T> {
  const registry = getExporterRegistry();
  const original = registry.get("langfuse");
  const replacement = new LangfuseExporter({
    enabled: true,
    publicKey: "pk-proof",
    secretKey: "sk-proof",
    baseUrl: ingest.url,
    maxBufferSize: 100,
    flushIntervalMs: 600_000,
    ...options,
  });
  await replacement.initialize();
  registry.unregister("langfuse");
  registry.register(replacement);
  try {
    return await run();
  } finally {
    registry.unregister("langfuse");
    if (original) {
      registry.register(original);
    }
    await replacement.shutdown();
  }
}

const longUpstreamMessage = `LONGERR-START ${"w".repeat(400)} LONGERR-END`;
const pooledUpstreamMessage = `echo: ERRTEXT-BP02 MASKME-BP02-POOLED ${longUpstreamMessage}`;
const passthroughUpstreamBody = `gateway echo: ERRTEXT-BP02 secret=BP02SECRETVALUE0123 MASKME-BP02-PT ${"p".repeat(700)} PTEND`;
const streamEventMessage = "ERRTEXT-BP02 Overloaded MASKME-BP02-STREAM";
const streamNoMessageDetail =
  "dump ERRTEXT-BP02 token=BP02TOKENVALUE0123 MASKME-BP02-NOMSG";
// With no message field the recorded text is the event's data line, as sent.
const streamNoMessagePayload = JSON.stringify({
  type: "error",
  detail: streamNoMessageDetail,
});
const errorScenarios = (tag: string) => ({
  pooled: () =>
    traced(`s-bp02-${tag}-pooled`, {
      upstream: jsonError(400, {
        type: "error",
        error: {
          type: "invalid_request_error",
          message: pooledUpstreamMessage,
        },
      }),
      body: {
        model: CLAUDE_MODEL,
        stream: false,
        max_tokens: 16,
        messages: [{ role: "user", content: "hello" }],
      },
    }),
  passthrough: () =>
    traced(`s-bp02-${tag}-passthrough`, {
      passthrough: true,
      upstream: () =>
        new Response(passthroughUpstreamBody, {
          status: 500,
          headers: { "content-type": "text/plain" },
        }),
      body: {
        model: CLAUDE_MODEL,
        stream: false,
        max_tokens: 16,
        messages: [{ role: "user", content: "hello" }],
      },
      headers: { "x-api-key": "sk-ant-api03-callerkey" },
    }),
  streamWithMessage: () =>
    traced(`s-bp02-${tag}-stream-msg`, {
      upstream: streamReply(
        messageStart("msg_bp02a") +
          `event: error\ndata: ${JSON.stringify({
            type: "error",
            error: {
              type: "overloaded_error",
              message: streamEventMessage,
            },
          })}\n\n`,
      ),
      body: {
        model: CLAUDE_MODEL,
        stream: true,
        max_tokens: 16,
        messages: [{ role: "user", content: "hello" }],
      },
    }),
  streamWithoutMessage: () =>
    traced(`s-bp02-${tag}-stream-nomsg`, {
      upstream: streamReply(
        messageStart("msg_bp02b") +
          `event: error\ndata: ${streamNoMessagePayload}\n\n`,
      ),
      body: {
        model: CLAUDE_MODEL,
        stream: true,
        max_tokens: 16,
        messages: [{ role: "user", content: "hello" }],
      },
    }),
});

type ErrorRuns = Record<
  keyof ReturnType<typeof errorScenarios>,
  Awaited<ReturnType<typeof traced>>
>;
async function runErrorScenarios(tag: string): Promise<ErrorRuns> {
  const scenarios = errorScenarios(tag);
  return {
    pooled: await scenarios.pooled(),
    passthrough: await scenarios.passthrough(),
    streamWithMessage: await scenarios.streamWithMessage(),
    streamWithoutMessage: await scenarios.streamWithoutMessage(),
  };
}

// The suite's own exporter: a mask that touches only MASKME-* tokens, so
// everything else shows what the proxy itself records.
const bp02Masked = await runErrorScenarios("mask").catch(
  (error: unknown) => error,
);
const bp02Redacted = await withLangfuseExporter({ redactIO: true }, () =>
  runErrorScenarios("redact"),
).catch((error: unknown) => error);

const errorTextOf = (s: SeenSpan) => text(s, "error.message");
const statusOf = (s: SeenSpan) =>
  text(s, "langfuse.observation.status_message");

await check(
  "BP02",
  "pooled Claude 400 (180-character path): error.message and the status message carry the upstream text, cut at 180 characters as before the follow-up",
  () => {
    expect(
      !(bp02Masked instanceof Error),
      `the scenario did not run: ${bp02Masked instanceof Error ? bp02Masked.message : ""}`,
    );
    const { root } = (bp02Masked as ErrorRuns).pooled;
    const message = errorTextOf(root);
    expect(message.includes("ERRTEXT-BP02"), "error.message lost the text");
    const expected = `${pooledUpstreamMessage.slice(0, 180)}...`;
    expect(
      message === expected,
      `error.message is ${message.length} characters and differs from the 180-character summary (${expected.length})`,
    );
    expect(
      statusOf(root) === `invalid_request_error: ${message}`,
      "the status message is not '<type>: <message>'",
    );
    expect(
      text(root, "error.type") === "invalid_request_error",
      "no error.type",
    );
  },
);

await check(
  "BP02",
  "passthrough 500 (500-character path): error.message equals the upstream body cut at 500 characters as before the follow-up, the secret= value left as sent",
  () => {
    expect(
      !(bp02Masked instanceof Error),
      `the scenario did not run: ${bp02Masked instanceof Error ? bp02Masked.message : ""}`,
    );
    const { root } = (bp02Masked as ErrorRuns).passthrough;
    const message = errorTextOf(root);
    expect(message.includes("ERRTEXT-BP02"), "error.message lost the text");
    expect(
      message.includes("secret=BP02SECRETVALUE0123"),
      "the secret= value is not recorded as sent",
    );
    const expected = passthroughUpstreamBody.slice(0, 500);
    expect(
      message === expected,
      `error.message is ${message.length} characters and differs from the 500-character cut (${expected.length})`,
    );
    expect(
      statusOf(root).startsWith("api_error: gateway echo"),
      "no status text",
    );
  },
);

await check(
  "BP02",
  "stream error event with and without a message: error.message equals the event's message, or its data line as sent when there is none (token= value included), as before the follow-up",
  () => {
    expect(
      !(bp02Masked instanceof Error),
      `the scenario did not run: ${bp02Masked instanceof Error ? bp02Masked.message : ""}`,
    );
    const withMessage = (bp02Masked as ErrorRuns).streamWithMessage.root;
    const without = (bp02Masked as ErrorRuns).streamWithoutMessage.root;
    expect(text(withMessage, "error.type") === "stream_error", "no error type");
    expect(
      errorTextOf(withMessage) === streamEventMessage,
      "the event's message is not recorded as sent",
    );
    expect(
      errorTextOf(without) === streamNoMessagePayload,
      `the event's data line is not recorded as sent (${errorTextOf(without).length} characters, expected ${streamNoMessagePayload.length})`,
    );
    expect(
      statusOf(withMessage) === `stream_error: ${streamEventMessage}`,
      "the status message of the event with a message is not '<type>: <message>'",
    );
    expect(
      statusOf(without) === `stream_error: ${errorTextOf(without)}`,
      "the status message is not '<type>: <message>'",
    );
  },
);

await check(
  "BP02",
  "mask configured: the error text arrives as recorded on error.message, outside the mask, as before the follow-up",
  () => {
    expect(
      !(bp02Masked instanceof Error),
      `the scenario did not run: ${bp02Masked instanceof Error ? bp02Masked.message : ""}`,
    );
    for (const [label, run] of Object.entries(bp02Masked as ErrorRuns)) {
      expect(
        errorTextOf(run.root).includes("ERRTEXT-BP02"),
        `${label}: the readable text is gone`,
      );
      expect(
        errorTextOf(run.root).includes("MASKME-BP02"),
        `${label}: the caller's mask reached the error text`,
      );
    }
  },
);

await check(
  "BP02",
  "redactIO configured: the error text, the error type and the status stay as recorded, as before the follow-up",
  () => {
    expect(
      !(bp02Redacted instanceof Error),
      `the scenario did not run: ${bp02Redacted instanceof Error ? bp02Redacted.message : ""}`,
    );
    for (const [label, run] of Object.entries(bp02Redacted as ErrorRuns)) {
      expect(
        text(run.root, "error.type") !== "" && run.root.attrs.error === true,
        `${label}: the error is no longer recorded`,
      );
      expect(
        errorTextOf(run.root).includes("ERRTEXT-BP02") &&
          statusOf(run.root).includes("ERRTEXT-BP02"),
        `${label}: redactIO removed the error text`,
      );
    }
  },
);

// ---------------------------------------------------------------------------
// BP03: the translated path withholds the prompt and the answer, and nothing else
// ---------------------------------------------------------------------------

// Keys the NeuroLink generation of a translated request carried at fc892bbb5,
// where it was recorded in a trace of its own with its prompt and answer
// (differential run, bc-proxy). Without the opt-in the follow-up withholds only
// `langfuse.observation.input` and `.output`: those are the request and response
// bodies the maintainer put behind NEUROLINK_PROXY_TRACE_BODY_LOGGING (K17).
const BASE_TRANSLATED_GENERATION_KEYS = [
  "gen_ai.observation.type",
  "langfuse.observation.completion_start_time",
  "langfuse.observation.cost_details",
  "langfuse.observation.metadata.provider",
  "langfuse.observation.model.name",
  "langfuse.observation.model.parameters",
  "langfuse.observation.type",
  "langfuse.observation.usage_details",
  "provider.total_attempts",
];

await check(
  "BP03",
  "translated request, flag unset: the NeuroLink generation keeps every key it carried before the follow-up and withholds only its input and output",
  () => {
    expect(
      !(translatedUnset instanceof Error),
      `the scenario did not run: ${translatedUnset instanceof Error ? translatedUnset.message : ""}`,
    );
    const generation = generationsOf(
      (translatedUnset as Awaited<ReturnType<typeof translatedRun>>).spans,
    )[0];
    expect(generation !== undefined, "no generation reached Langfuse");
    const missing = BASE_TRANSLATED_GENERATION_KEYS.filter(
      (key) => !(key in generation.attrs),
    );
    expect(missing.length === 0, `keys dropped: ${missing.join(", ")}`);
    expect(
      !("langfuse.observation.input" in generation.attrs) &&
        !("langfuse.observation.output" in generation.attrs),
      "the generation records its prompt or answer without the opt-in",
    );
    expect(
      text(generation, "langfuse.observation.model.name") === "gpt-4o-mini",
      "model changed",
    );
  },
);

await check(
  "BP03",
  "translated request, flag set: the generation carries the same keys plus its prompt and answer",
  () => {
    expect(
      !(translatedOptIn instanceof Error),
      `the scenario did not run: ${translatedOptIn instanceof Error ? translatedOptIn.message : ""}`,
    );
    const generation = generationsOf(
      (translatedOptIn as Awaited<ReturnType<typeof translatedRun>>).spans,
    )[0];
    expect(generation !== undefined, "no generation reached Langfuse");
    const missing = [
      ...BASE_TRANSLATED_GENERATION_KEYS,
      "langfuse.observation.input",
      "langfuse.observation.output",
    ].filter((key) => !(key in generation.attrs));
    expect(missing.length === 0, `keys dropped: ${missing.join(", ")}`);
  },
);

// ---------------------------------------------------------------------------
// BP05: nothing the release users run recorded is gone from the proxy records,
// the Codex tap or the realtime turns
// ---------------------------------------------------------------------------

// Attribute keys and event names fc892bbb5 recorded for each request shape
// (differential run, bc-proxy). The follow-up may add to them, never remove one.
const BASE_PROXY_RECORDS: Record<
  string,
  { root: string[]; rootEvents: string[]; generation: string[] }
> = {
  pooledJson: {
    root: [
      "ai.cost.basis",
      "ai.cost.currency",
      "ai.cost.pricing_status",
      "ai.cost.total",
      "ai.tokens.cache_creation",
      "ai.tokens.cache_read",
      "ai.tokens.input",
      "ai.tokens.output",
      "ai.tokens.total",
      "gen_ai.observation.type",
      "gen_ai.response.finish_reason",
      "http.method",
      "http.status_code",
      "http.target",
      "langfuse.observation.metadata.account",
      "langfuse.observation.type",
      "langfuse.trace.metadata.clientApp",
      "langfuse.trace.metadata.conversationId",
      "langfuse.trace.metadata.requestId",
      "langfuse.trace.metadata.stream",
      "langfuse.trace.metadata.toolCount",
      "langfuse.trace.name",
      "proxy.account",
      "proxy.account.healthy",
      "proxy.account.selected",
      "proxy.account.strategy",
      "proxy.account.total",
      "proxy.account.type",
      "proxy.client_app",
      "proxy.duration_ms",
      "proxy.mode",
      "proxy.request.model",
      "proxy.request_id",
      "proxy.response.model",
      "proxy.stream",
      "proxy.tool_count",
      "proxy.usage.input_tokens",
      "proxy.usage.output_tokens",
      "proxy.usage.total_tokens",
      "session.id",
      "user.id",
    ],
    rootEvents: [
      "proxy.client.request_headers",
      "proxy.client.request_body",
      "proxy.upstream.request_headers",
      "proxy.upstream.request_body",
      "proxy.upstream.response_headers",
      "proxy.upstream.response_body",
    ],
    generation: [
      "gen_ai.observation.type",
      "langfuse.observation.cost_details",
      "langfuse.observation.metadata.account",
      "langfuse.observation.metadata.finishReason",
      "langfuse.observation.metadata.provider",
      "langfuse.observation.metadata.requestedModel",
      "langfuse.observation.model.name",
      "langfuse.observation.type",
      "langfuse.observation.usage_details",
      "langfuse.trace.metadata.clientApp",
      "langfuse.trace.metadata.conversationId",
      "langfuse.trace.metadata.requestId",
      "langfuse.trace.metadata.stream",
      "langfuse.trace.metadata.toolCount",
      "langfuse.trace.name",
      "proxy.request_id",
      "session.id",
      "user.id",
    ],
  },
  pooledStream: {
    root: [
      "ai.cost.basis",
      "ai.cost.currency",
      "ai.cost.pricing_status",
      "ai.cost.total",
      "ai.tokens.cache_creation",
      "ai.tokens.cache_read",
      "ai.tokens.input",
      "ai.tokens.output",
      "ai.tokens.total",
      "gen_ai.observation.type",
      "gen_ai.response.finish_reason",
      "http.method",
      "http.status_code",
      "http.target",
      "langfuse.observation.metadata.account",
      "langfuse.observation.type",
      "langfuse.trace.metadata.clientApp",
      "langfuse.trace.metadata.conversationId",
      "langfuse.trace.metadata.requestId",
      "langfuse.trace.metadata.stream",
      "langfuse.trace.metadata.toolCount",
      "langfuse.trace.name",
      "proxy.account",
      "proxy.account.healthy",
      "proxy.account.selected",
      "proxy.account.strategy",
      "proxy.account.total",
      "proxy.account.type",
      "proxy.client_app",
      "proxy.duration_ms",
      "proxy.mode",
      "proxy.request.model",
      "proxy.request_id",
      "proxy.response.model",
      "proxy.stream",
      "proxy.tool_count",
      "proxy.usage.input_tokens",
      "proxy.usage.output_tokens",
      "proxy.usage.total_tokens",
      "session.id",
      "user.id",
    ],
    rootEvents: [
      "proxy.client.request_headers",
      "proxy.client.request_body",
      "proxy.upstream.request_headers",
      "proxy.upstream.request_body",
      "proxy.upstream.response_headers",
      "proxy.stream.events",
      "proxy.upstream.response_body",
    ],
    generation: [
      "gen_ai.observation.type",
      "langfuse.observation.completion_start_time",
      "langfuse.observation.cost_details",
      "langfuse.observation.metadata.account",
      "langfuse.observation.metadata.finishReason",
      "langfuse.observation.metadata.provider",
      "langfuse.observation.metadata.requestedModel",
      "langfuse.observation.model.name",
      "langfuse.observation.type",
      "langfuse.observation.usage_details",
      "langfuse.trace.metadata.clientApp",
      "langfuse.trace.metadata.conversationId",
      "langfuse.trace.metadata.requestId",
      "langfuse.trace.metadata.stream",
      "langfuse.trace.metadata.toolCount",
      "langfuse.trace.name",
      "proxy.request_id",
      "session.id",
      "user.id",
    ],
  },
  passthroughStream: {
    root: [
      "ai.cost.basis",
      "ai.cost.currency",
      "ai.cost.pricing_status",
      "ai.cost.total",
      "ai.tokens.cache_creation",
      "ai.tokens.cache_read",
      "ai.tokens.input",
      "ai.tokens.output",
      "ai.tokens.total",
      "gen_ai.observation.type",
      "gen_ai.response.finish_reason",
      "http.method",
      "http.status_code",
      "http.target",
      "langfuse.observation.type",
      "langfuse.trace.metadata.clientApp",
      "langfuse.trace.metadata.conversationId",
      "langfuse.trace.metadata.requestId",
      "langfuse.trace.metadata.stream",
      "langfuse.trace.metadata.toolCount",
      "langfuse.trace.name",
      "proxy.client_app",
      "proxy.duration_ms",
      "proxy.mode",
      "proxy.request.model",
      "proxy.request_id",
      "proxy.response.model",
      "proxy.stream",
      "proxy.tool_count",
      "proxy.usage.input_tokens",
      "proxy.usage.output_tokens",
      "proxy.usage.total_tokens",
      "session.id",
      "user.id",
    ],
    rootEvents: [
      "proxy.client.request_headers",
      "proxy.client.request_body",
      "proxy.upstream.request_headers",
      "proxy.upstream.request_body",
      "proxy.upstream.response_headers",
      "proxy.stream.events",
      "proxy.upstream.response_body",
    ],
    generation: [
      "gen_ai.observation.type",
      "langfuse.observation.completion_start_time",
      "langfuse.observation.cost_details",
      "langfuse.observation.metadata.finishReason",
      "langfuse.observation.metadata.provider",
      "langfuse.observation.metadata.requestedModel",
      "langfuse.observation.model.name",
      "langfuse.observation.type",
      "langfuse.observation.usage_details",
      "langfuse.trace.metadata.clientApp",
      "langfuse.trace.metadata.conversationId",
      "langfuse.trace.metadata.requestId",
      "langfuse.trace.metadata.stream",
      "langfuse.trace.metadata.toolCount",
      "langfuse.trace.name",
      "proxy.request_id",
      "session.id",
      "user.id",
    ],
  },
  pooledError: {
    root: [
      "error",
      "error.message",
      "error.type",
      "gen_ai.observation.type",
      "http.method",
      "http.status_code",
      "http.target",
      "langfuse.observation.level",
      "langfuse.observation.metadata.account",
      "langfuse.observation.status_message",
      "langfuse.observation.type",
      "langfuse.trace.metadata.clientApp",
      "langfuse.trace.metadata.conversationId",
      "langfuse.trace.metadata.requestId",
      "langfuse.trace.metadata.stream",
      "langfuse.trace.metadata.toolCount",
      "langfuse.trace.name",
      "proxy.account",
      "proxy.account.healthy",
      "proxy.account.selected",
      "proxy.account.strategy",
      "proxy.account.total",
      "proxy.account.type",
      "proxy.client_app",
      "proxy.duration_ms",
      "proxy.mode",
      "proxy.request.model",
      "proxy.request_id",
      "proxy.stream",
      "proxy.tool_count",
      "session.id",
      "user.id",
    ],
    rootEvents: [
      "proxy.client.request_headers",
      "proxy.client.request_body",
      "proxy.upstream.request_headers",
      "proxy.upstream.request_body",
      "proxy.upstream.response_headers",
      "proxy.upstream.response_body",
    ],
    generation: [
      "gen_ai.observation.type",
      "langfuse.observation.level",
      "langfuse.observation.metadata.account",
      "langfuse.observation.metadata.provider",
      "langfuse.observation.metadata.requestedModel",
      "langfuse.observation.model.name",
      "langfuse.observation.status_message",
      "langfuse.observation.type",
      "langfuse.trace.metadata.clientApp",
      "langfuse.trace.metadata.conversationId",
      "langfuse.trace.metadata.requestId",
      "langfuse.trace.metadata.stream",
      "langfuse.trace.metadata.toolCount",
      "langfuse.trace.name",
      "proxy.request_id",
      "session.id",
      "user.id",
    ],
  },
  codex: {
    root: [
      "ai.cost.basis",
      "ai.cost.currency",
      "ai.cost.pricing_status",
      "ai.cost.total",
      "ai.tokens.cache_read",
      "ai.tokens.input",
      "ai.tokens.output",
      "ai.tokens.reasoning",
      "ai.tokens.total",
      "gen_ai.observation.type",
      "gen_ai.response.finish_reason",
      "http.method",
      "http.status_code",
      "http.target",
      "langfuse.observation.metadata.account",
      "langfuse.observation.type",
      "langfuse.trace.metadata.clientApp",
      "langfuse.trace.metadata.conversationId",
      "langfuse.trace.metadata.requestId",
      "langfuse.trace.metadata.stream",
      "langfuse.trace.metadata.toolCount",
      "langfuse.trace.name",
      "proxy.account",
      "proxy.account.healthy",
      "proxy.account.selected",
      "proxy.account.strategy",
      "proxy.account.total",
      "proxy.account.type",
      "proxy.client_app",
      "proxy.duration_ms",
      "proxy.mode",
      "proxy.request.model",
      "proxy.request_id",
      "proxy.response.model",
      "proxy.stream",
      "proxy.tool_count",
      "proxy.usage.input_tokens",
      "proxy.usage.output_tokens",
      "proxy.usage.total_tokens",
      "session.id",
      "user.id",
    ],
    rootEvents: [],
    generation: [
      "gen_ai.observation.type",
      "langfuse.observation.completion_start_time",
      "langfuse.observation.cost_details",
      "langfuse.observation.metadata.account",
      "langfuse.observation.metadata.finishReason",
      "langfuse.observation.metadata.provider",
      "langfuse.observation.metadata.requestedModel",
      "langfuse.observation.model.name",
      "langfuse.observation.type",
      "langfuse.observation.usage_details",
      "langfuse.trace.metadata.clientApp",
      "langfuse.trace.metadata.conversationId",
      "langfuse.trace.metadata.requestId",
      "langfuse.trace.metadata.stream",
      "langfuse.trace.metadata.toolCount",
      "langfuse.trace.name",
      "proxy.request_id",
      "session.id",
      "user.id",
    ],
  },
};

// `traced` sets the session header itself.
const identity = (n: string) => ({
  "x-neurolink-user-id": `u-${n}`,
  "x-neurolink-conversation-id": `c-${n}`,
});
const successBody = (stream: boolean) => ({
  model: CLAUDE_MODEL,
  stream,
  max_tokens: 16,
  messages: [{ role: "user", content: "hello" }],
});

const bp05Runs = await (async () => {
  const run = (
    key: string,
    args: Parameters<typeof traced>[1],
  ): Promise<Awaited<ReturnType<typeof traced>>> =>
    traced(`s-bp05-${key}`, args);
  return {
    pooledJson: await run("json", {
      upstream: () =>
        new Response(claudeJson("ok"), {
          headers: { "content-type": "application/json" },
        }),
      body: successBody(false),
      headers: identity("json"),
    }),
    pooledStream: await run("stream", {
      upstream: streamReply(claudeStream("ok")),
      body: successBody(true),
      headers: identity("stream"),
    }),
    passthroughStream: await run("pt", {
      passthrough: true,
      upstream: streamReply(claudeStream("ok")),
      body: successBody(true),
      headers: { ...identity("pt"), "x-api-key": "sk-ant-api03-callerkey" },
    }),
    pooledError: await run("err", {
      upstream: jsonError(400, {
        type: "error",
        error: { type: "invalid_request_error", message: "bad field" },
      }),
      body: successBody(false),
      headers: identity("err"),
    }),
    codex: await run("codex", {
      kind: "codex",
      upstream: () =>
        new Response(codexCompleted("ok"), {
          headers: { "content-type": "text/event-stream" },
        }),
      body: codexRequest("hello"),
      headers: identity("codex"),
    }),
  };
})().catch((error: unknown) => error);

await check(
  "BP05",
  "Claude pooled and passthrough, error and Codex requests: the proxy.request root, its events and its generation keep every attribute key and event name of the release users run",
  () => {
    expect(
      !(bp05Runs instanceof Error),
      `the scenarios did not run: ${bp05Runs instanceof Error ? bp05Runs.message : ""}`,
    );
    const runs = bp05Runs as Record<string, Awaited<ReturnType<typeof traced>>>;
    const problems: string[] = [];
    for (const [shape, expected] of Object.entries(BASE_PROXY_RECORDS)) {
      const { root, spans } = runs[shape];
      const generation = spans.find(
        (s) =>
          s.parentSpanId === root.spanId &&
          (s.name === "generate" || s.name === "stream"),
      );
      for (const key of expected.root) {
        if (!(key in root.attrs)) {
          problems.push(`${shape} root lost ${key}`);
        }
      }
      const events = root.events.map((e) => e.name);
      for (const name of expected.rootEvents) {
        if (!events.includes(name)) {
          problems.push(`${shape} root lost event ${name}`);
        }
      }
      if (generation === undefined) {
        problems.push(`${shape} has no generation under the root`);
        continue;
      }
      for (const key of expected.generation) {
        if (!(key in generation.attrs)) {
          problems.push(`${shape} generation lost ${key}`);
        }
      }
    }
    expect(problems.length === 0, problems.slice(0, 6).join("; "));
  },
);

await check(
  "BP05",
  "Codex tap: a completed response that carries its own output is recorded as it arrived, and one without an output stays unrecorded",
  async () => {
    const usage = {
      input_tokens: 5,
      output_tokens: 3,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens_details: { reasoning_tokens: 0 },
    };
    const ownOutput = [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "own" }],
      },
    ];
    const withOutput = await tapEvidence([
      codexFrame("response.output_item.done", {
        item: { type: "function_call", name: "lookup", arguments: "{}" },
      }),
      codexFrame("response.completed", {
        response: { id: "r", output: ownOutput, usage },
      }),
    ]);
    expect(
      JSON.stringify(withOutput.response?.output) === JSON.stringify(ownOutput),
      "a streamed item replaced the completed response's own output",
    );
    const withoutOutput = await tapEvidence([
      codexFrame("response.completed", { response: { id: "r", usage } }),
    ]);
    expect(
      withoutOutput.response === undefined,
      "a response with no output is now recorded",
    );
    const emptyOutput = await tapEvidence([
      codexFrame("response.completed", {
        response: { id: "r", output: [], usage },
      }),
    ]);
    expect(
      JSON.stringify(emptyOutput.response?.output) === "[]",
      "an empty output is not recorded as empty",
    );
  },
);

await check(
  "BP05",
  "Codex tap: items announced by output_item.done only add to a completed response that arrived with an empty output",
  async () => {
    const usage = {
      input_tokens: 5,
      output_tokens: 3,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens_details: { reasoning_tokens: 0 },
    };
    const evidence = await tapEvidence([
      codexFrame("response.output_item.done", {
        item: { type: "function_call", name: "lookup", arguments: "{}" },
      }),
      codexFrame("response.completed", {
        response: { id: "r", output: [], usage },
      }),
    ]);
    const output = (evidence.response?.output ?? []) as Array<
      Record<string, unknown>
    >;
    expect(
      output.length === 1 && output[0]?.type === "function_call",
      "the announced item is not recorded",
    );
    expect(evidence.completed === true, "the completion is no longer seen");
    expect(
      evidence.observationIncomplete !== true &&
        evidence.outputItemsOmitted !== true,
      "an uncapped stream is marked incomplete",
    );
  },
);

const realtimeBaseline = await (async () => {
  ingest.reset();
  const call = voiceCall();
  const memory = await setUpRealtimeCallMemory(call.ctx, {
    ...store(() => Promise.resolve()),
    flushBudgetMs: 800,
  });
  expect(memory !== undefined, "no memory for a verified call");
  memory.recorder.userTranscript({ text: "bp05-question", final: true });
  memory.recorder.assistantMessage({ id: "bp05-1", text: "bp05-answer" });
  await pause(100);
  for (const callback of call.callbacks) {
    await callback();
  }
  await settle(() => realtimeTurns(call.session).length >= 1, 3_000);
  const root = realtimeTurns(call.session)[0];
  const generation = ingest.seen.find(
    (s) => s.name === "realtime" && s.parentSpanId === root?.spanId,
  );
  return { call, root, generation };
})().catch((error: unknown) => error);

await check(
  "BP05",
  "realtime turn with a fast store: the turn and its generation record every key and value of the release users run",
  () => {
    expect(
      !(realtimeBaseline instanceof Error),
      `the scenario did not run: ${realtimeBaseline instanceof Error ? realtimeBaseline.message : ""}`,
    );
    const { call, root, generation } = realtimeBaseline as {
      call: ReturnType<typeof voiceCall>;
      root?: SeenSpan;
      generation?: SeenSpan;
    };
    expect(root !== undefined, "the turn was not traced");
    expect(generation !== undefined, "the turn has no generation");
    const identityKeys = {
      "session.id": call.session,
      "langfuse.trace.name": "realtime-turn",
      "langfuse.trace.tags": '["voice"]',
    };
    const expected = (observed: SeenSpan, values: Record<string, Attr>) =>
      Object.entries({ ...identityKeys, ...values })
        .filter(([key, value]) => observed.attrs[key] !== value)
        .map(([key]) => key);
    const turnProblems = expected(root, {
      "gen_ai.observation.type": "agent",
      "langfuse.observation.type": "agent",
      "langfuse.observation.input": "bp05-question",
      "langfuse.observation.output": "bp05-answer",
      "langfuse.trace.input": "bp05-question",
      "langfuse.trace.output": "bp05-answer",
    });
    const generationProblems = expected(generation, {
      "gen_ai.observation.type": "generation",
      "langfuse.observation.type": "generation",
      "langfuse.observation.metadata.provider": "vertex",
      "langfuse.observation.input":
        '[{"role":"user","content":"bp05-question"}]',
      "langfuse.observation.output":
        '[{"role":"assistant","content":"bp05-answer"}]',
    });
    expect(turnProblems.length === 0, `turn keys changed: ${turnProblems}`);
    expect(
      generationProblems.length === 0,
      `generation keys changed: ${generationProblems}`,
    );
    expect(
      typeof root.attrs["user.id"] === "string" &&
        root.attrs["langfuse.trace.metadata.roomName"] !== undefined,
      "the turn lost its user or room",
    );
  },
);

// ---------------------------------------------------------------------------
// BP05 (continued): proxy-authored error text, the OpenAI- and Gemini-format
// routes, the flag's parsing, the Codex cap's effect on timing, a callback type
// ---------------------------------------------------------------------------

const slowClaudeStream =
  (frames: string[], gapMs: number): Upstream =>
  () => {
    const encoder = new TextEncoder();
    let index = 0;
    return new Response(
      new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (index >= frames.length) {
            controller.close();
            return;
          }
          if (index > 0) {
            await pause(gapMs);
          }
          controller.enqueue(encoder.encode(frames[index++]));
        },
      }),
      { headers: { "content-type": "text/event-stream" } },
    );
  };

const generationOfRoot = (run: Awaited<ReturnType<typeof traced>>) =>
  run.spans.find(
    (s) =>
      s.parentSpanId === run.root.spanId &&
      (s.name === "generate" || s.name === "stream"),
  );

const bp05Text = await (async () => {
  const abort = await traced("s-bp05-abort", {
    upstream: slowClaudeStream(
      [
        messageStart("msg_abort"),
        sse("content_block_start", {
          index: 0,
          content_block: { type: "text", text: "" },
        }),
        ...["a", "b", "c", "d"].map((delta) =>
          sse("content_block_delta", {
            index: 0,
            delta: { type: "text_delta", text: delta },
          }),
        ),
        sse("content_block_stop", { index: 0 }),
        sse("message_stop", {}),
      ],
      120,
    ),
    body: successBody(true),
    headers: identity("abort"),
    abortAfterFirstChunk: true,
  });
  const allFailed = await traced("s-bp05-allfailed", {
    upstream: jsonError(500, {
      type: "error",
      error: { type: "api_error", message: "BP05-UPSTREAM-500" },
    }),
    body: successBody(false),
    headers: identity("allfailed"),
  });
  const codex = await traced("s-bp05-codex-error", {
    kind: "codex",
    upstream: () =>
      new Response("BP05-CODEX-500 upstream exploded", {
        status: 500,
        headers: { "content-type": "text/plain" },
      }),
    body: codexRequest("hello"),
    headers: identity("codexerr"),
  });
  return { abort, allFailed, codex };
})().catch((error: unknown) => error);

await check(
  "BP05",
  "text the proxy writes itself (client hang-up, every account failed) is recorded on error.message and the status message of the root and the generation, as before the follow-up",
  () => {
    expect(
      !(bp05Text instanceof Error),
      `the scenarios did not run: ${bp05Text instanceof Error ? bp05Text.message : ""}`,
    );
    const { abort, allFailed } = bp05Text as {
      abort: Awaited<ReturnType<typeof traced>>;
      allFailed: Awaited<ReturnType<typeof traced>>;
    };
    const cancelled = "Client cancelled the streaming response";
    expect(
      text(abort.root, "error.type") === "client_cancelled" &&
        text(abort.root, "error.message") === cancelled,
      `client hang-up: error.message is '${text(abort.root, "error.message")}'`,
    );
    expect(
      text(abort.root, "langfuse.observation.status_message") ===
        `client_cancelled: ${cancelled}`,
      "client hang-up: the root status message lost the text",
    );
    expect(
      text(generationOfRoot(abort), "langfuse.observation.status_message") ===
        `client_cancelled: ${cancelled}`,
      "client hang-up: the generation status message lost the text",
    );
    const failed = text(allFailed.root, "error.message");
    expect(
      failed.startsWith(
        "All Anthropic accounts failed due to transient upstream/network errors. Last error:",
      ) && failed.includes("BP05-UPSTREAM-500"),
      `all accounts failed: error.message is '${failed.slice(0, 80)}'`,
    );
    const status = `${text(allFailed.root, "error.type")}: ${failed}`;
    expect(
      text(allFailed.root, "langfuse.observation.status_message") === status &&
        text(
          generationOfRoot(allFailed),
          "langfuse.observation.status_message",
        ) === status,
      "all accounts failed: a status message lost the text",
    );
  },
);

await check(
  "BP05",
  "Codex upstream failure: the root's error.message and the root and generation status messages carry the upstream text, as before the follow-up",
  () => {
    expect(
      !(bp05Text instanceof Error),
      `the scenarios did not run: ${bp05Text instanceof Error ? bp05Text.message : ""}`,
    );
    const { codex } = bp05Text as {
      codex: Awaited<ReturnType<typeof traced>>;
    };
    const message = "BP05-CODEX-500 upstream exploded";
    expect(
      text(codex.root, "error.message") === message,
      `error.message is '${text(codex.root, "error.message")}'`,
    );
    const status = `${text(codex.root, "error.type")}: ${message}`;
    expect(
      text(codex.root, "langfuse.observation.status_message") === status &&
        text(generationOfRoot(codex), "langfuse.observation.status_message") ===
          status,
      "a status message lost the upstream text",
    );
  },
);

const bp05Formats = await (async () => {
  const run = (key: string, path: string, body: unknown) =>
    traced(`s-bp05-${key}`, {
      path,
      neurolink: translatedNeuroLink,
      modelRouter: translatedRouter,
      upstream: () => new Response("unexpected", { status: 599 }),
      body,
      headers: {
        ...REQUEST_HEADER_TABLE,
        "x-neurolink-session-id": `s-bp05-${key}`,
      },
    });
  return {
    openai: await run("openai-headers", "/v1/chat/completions", {
      model: "gpt-4o-mini",
      stream: false,
      messages: [{ role: "user", content: "hi" }],
    }),
    gemini: await run(
      "gemini-headers",
      "/v1beta/models/gemini-2.5-flash:generateContent",
      { contents: [{ role: "user", parts: [{ text: "hi" }] }] },
    ),
  };
})().catch((error: unknown) => error);

await check(
  "BP05",
  "OpenAI- and Gemini-format routes: any header event follows the BP01 rule, and no value of a header the released rule redacts leaves the process",
  () => {
    expect(
      !(bp05Formats instanceof Error),
      `the scenarios did not run: ${bp05Formats instanceof Error ? bp05Formats.message : ""}`,
    );
    const credentials = Object.entries(REQUEST_HEADER_TABLE)
      .filter(([name, value]) => baseRedacts(name) && value.includes("BP01-"))
      .map(([, value]) => value.replace(/^(Bearer |Basic |sha256=)/, ""));
    for (const [label, run] of Object.entries(
      bp05Formats as Record<string, Awaited<ReturnType<typeof traced>>>,
    )) {
      for (const event of run.root.events) {
        if (event.name.endsWith("_headers")) {
          expectBaseHeaders(
            JSON.parse(String(event.attrs["proxy.headers"] ?? "{}")),
            undefined,
            `${label} ${event.name}`,
          );
        }
      }
      const leaked = credentials.filter((secret) =>
        run.raw.some((post) => post.includes(secret)),
      );
      expect(
        leaked.length === 0,
        `${label}: credential values exported: ${leaked.join(", ")}`,
      );
    }
  },
);

const bp05Flag = await (async () => {
  const run = (value: string) =>
    underEnv({ NEUROLINK_PROXY_TRACE_BODY_LOGGING: value }, () =>
      traced(`s-bp05-flag-${value.trim()}-${value.length}`, {
        upstream: () =>
          new Response(claudeJson("BP05-FLAG-ANSWER"), {
            headers: { "content-type": "application/json" },
          }),
        body: {
          model: CLAUDE_MODEL,
          stream: false,
          max_tokens: 16,
          messages: [{ role: "user", content: "BP05-FLAG-PROMPT" }],
        },
      }),
    );
  return {
    upper: await run("TRUE"),
    padded: await run(" true "),
    exact: await run("true"),
  };
})().catch((error: unknown) => error);

await check(
  "BP06",
  "NEUROLINK_PROXY_TRACE_BODY_LOGGING enables bodies only for the exact value true, as before the follow-up",
  () => {
    expect(
      !(bp05Flag instanceof Error),
      `the scenarios did not run: ${bp05Flag instanceof Error ? bp05Flag.message : ""}`,
    );
    const runs = bp05Flag as Record<string, Awaited<ReturnType<typeof traced>>>;
    for (const label of ["upper", "padded"]) {
      const { root, raw } = runs[label];
      expect(
        !raw.some(
          (post) =>
            post.includes("BP05-FLAG-ANSWER") ||
            post.includes("BP05-FLAG-PROMPT"),
        ),
        `${label}: a body was recorded`,
      );
      expect(
        inputOf(root) === "" && outputOf(root) === "",
        `${label}: the root has an input or an output`,
      );
    }
    expect(
      runs.exact.raw.some((post) => post.includes("BP05-FLAG-ANSWER")),
      "the exact value no longer records bodies",
    );
  },
);

await check(
  "BP07",
  "Codex tap: output items past the cap leave a marker but do not hide when the first output was seen",
  async () => {
    const usage = {
      input_tokens: 5,
      output_tokens: 3,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens_details: { reasoning_tokens: 0 },
    };
    const evidence = await tapEvidence([
      codexFrame("response.output_text.delta", { delta: "A" }),
      codexFrame("response.output_item.done", {
        item: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "B".repeat(1_100_000) }],
        },
      }),
      codexFrame("response.completed", {
        response: { id: "r", output: [], usage },
      }),
    ]);
    expect(
      evidence.firstUsefulOutputAt !== undefined,
      "the first output was not seen",
    );
    expect(
      evidence.observationIncomplete !== true,
      "the cap marks the first-output timing unobserved",
    );
    expect(
      JSON.stringify(evidence.response?.output ?? []).includes("truncated"),
      "the omitted items left no marker",
    );
  },
);

await check(
  "BP08",
  "realtime tool callbacks: a caller that invokes onToolStart and onToolEnd with the payload of the release users run still type-checks",
  async () => {
    const ts = await import("typescript");
    const typesIndex = new URL("../src/lib/types/index.js", import.meta.url)
      .pathname;
    const directory = mkdtempSync(join(tmpdir(), "bp05-callid-"));
    try {
      const fixture = join(directory, "caller.ts");
      writeFileSync(
        fixture,
        [
          `import type { BuildRealtimeMcpToolsParams } from ${JSON.stringify(typesIndex)};`,
          "declare const params: BuildRealtimeMcpToolsParams;",
          'params.onToolStart?.({ name: "lookup", args: {} });',
          'params.onToolEnd?.({ name: "lookup", result: "ok" });',
        ].join("\n"),
      );
      const program = ts.createProgram([fixture], {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        types: [],
      });
      const source = program.getSourceFile(fixture);
      expect(source !== undefined, "the fixture was not loaded");
      const problems = program
        .getSemanticDiagnostics(source)
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "));
      expect(
        problems.length === 0,
        `callback payloads no longer compile: ${problems.join("; ").slice(0, 200)}`,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

const bp08Pairing = await (async () => {
  ingest.reset();
  const call = voiceCall();
  const memory = await setUpRealtimeCallMemory(call.ctx, {
    ...store(() => Promise.resolve()),
    flushBudgetMs: 800,
  });
  expect(memory !== undefined, "no memory for a verified call");
  const { recorder } = memory;
  // Without a call id, one call after the other, as the release users run sent them.
  recorder.userTranscript({ text: "bp08-plain", final: true });
  recorder.toolStart({ name: "lookup", args: { q: "plain-1" } });
  recorder.toolEnd({ name: "lookup", result: "plain-r1" });
  recorder.toolStart({ name: "lookup", args: { q: "plain-2" } });
  recorder.toolEnd({ name: "lookup", result: "plain-r2" });
  recorder.assistantMessage({ id: "bp08-plain-1", text: "done" });
  // With call ids, two calls of one tool overlapping and ending in reverse.
  recorder.userTranscript({ text: "bp08-ids", final: true });
  recorder.toolStart({ name: "lookup", args: { q: "id-A" }, callId: "A" });
  recorder.toolStart({ name: "lookup", args: { q: "id-B" }, callId: "B" });
  recorder.toolEnd({ name: "lookup", result: "id-rB", callId: "B" });
  recorder.toolEnd({ name: "lookup", result: "id-rA", callId: "A" });
  recorder.assistantMessage({ id: "bp08-ids-1", text: "done" });
  await pause(100);
  for (const callback of call.callbacks) {
    await callback();
  }
  await settle(() => realtimeTurns(call.session).length >= 2, 3_000);
  const roots = realtimeTurns(call.session).map((turn) => turn.spanId);
  const tools = ingest.seen.filter(
    (s) =>
      s.name === "lookup" &&
      s.parentSpanId !== undefined &&
      roots.includes(s.parentSpanId),
  );
  const plain = (value: string) => value.replace(/[{}"]/g, "");
  const pairs = tools.map((s) => `${plain(inputOf(s))}=${plain(outputOf(s))}`);
  return pairs.sort();
})().catch((error: unknown) => error);

await check(
  "BP08",
  "realtime tool calls pair their start and end with and without a call id",
  () => {
    expect(
      !(bp08Pairing instanceof Error),
      `the scenario did not run: ${bp08Pairing instanceof Error ? bp08Pairing.message : ""}`,
    );
    expect(
      JSON.stringify(bp08Pairing) ===
        JSON.stringify([
          "q:id-A=id-rA",
          "q:id-B=id-rB",
          "q:plain-1=plain-r1",
          "q:plain-2=plain-r2",
        ]),
      `tool spans paired as [${(bp08Pairing as string[]).join(", ")}]`,
    );
  },
);

// ---------------------------------------------------------------------------
// BP04: proxy metric names, units and label names are those of the release
// users run
// ---------------------------------------------------------------------------

// Read from a real MeterProvider at fc892bbb5 (differential run, bc-proxy).
const BASE_PROXY_METRICS: Record<string, { unit: string; labels: string[] }> = {
  proxy_cost_usd_total: { unit: "USD", labels: ["account", "model"] },
  proxy_errors_total: {
    unit: "{error}",
    labels: ["account", "error_type", "model", "status"],
  },
  proxy_fallback_attempts_total: {
    unit: "{attempt}",
    labels: ["model", "provider"],
  },
  proxy_fallback_failure_total: {
    unit: "{failure}",
    labels: ["error", "model", "provider"],
  },
  proxy_fallback_success_total: {
    unit: "{success}",
    labels: ["model", "provider"],
  },
  proxy_model_substitution_total: {
    unit: "{substitution}",
    labels: ["actual_model", "requested_model"],
  },
  proxy_request_body_bytes: { unit: "By", labels: ["account", "model"] },
  proxy_request_duration_ms: {
    unit: "ms",
    labels: ["account", "mode", "model", "status", "stream"],
  },
  proxy_requests_total: {
    unit: "{request}",
    labels: ["account", "mode", "model", "status", "stream"],
  },
  proxy_response_body_bytes: { unit: "By", labels: ["account", "model"] },
  proxy_retries_total: {
    unit: "{retry}",
    labels: ["account", "model", "reason"],
  },
  proxy_tokens_cache_creation: {
    unit: "{token}",
    labels: ["account", "model"],
  },
  proxy_tokens_cache_read: { unit: "{token}", labels: ["account", "model"] },
  proxy_tokens_input: { unit: "{token}", labels: ["account", "model"] },
  proxy_tokens_output: { unit: "{token}", labels: ["account", "model"] },
};

const proxyMetricShapes = await (async () => {
  const { resourceMetrics } = await metricReader.collect();
  return resourceMetrics.scopeMetrics.flatMap((scope) =>
    scope.metrics
      .filter((metric) => metric.descriptor.name.startsWith("proxy_"))
      .map((metric) => ({
        name: metric.descriptor.name,
        unit: metric.descriptor.unit,
        labels: [
          ...new Set(
            metric.dataPoints.flatMap((point) => Object.keys(point.attributes)),
          ),
        ].sort(),
      })),
  );
})().catch((error: unknown) => error);

await check(
  "BP04",
  "every proxy metric the routes and the fallback legs record keeps the name, unit and label names of the release users run",
  () => {
    expect(
      !(proxyMetricShapes instanceof Error),
      "the metric reader could not collect",
    );
    const shapes = proxyMetricShapes as Array<{
      name: string;
      unit: string;
      labels: string[];
    }>;
    const unknown = shapes
      .map((shape) => shape.name)
      .filter((name) => !(name in BASE_PROXY_METRICS));
    expect(
      unknown.length === 0,
      `proxy metrics the release users run does not have: ${unknown.join(", ")}`,
    );
    for (const required of [
      "proxy_requests_total",
      "proxy_request_duration_ms",
      "proxy_tokens_input",
      "proxy_tokens_output",
      "proxy_cost_usd_total",
      "proxy_errors_total",
      "proxy_fallback_attempts_total",
      "proxy_fallback_failure_total",
    ]) {
      expect(
        shapes.some((shape) => shape.name === required),
        `${required} was not recorded by the scenarios`,
      );
    }
    for (const shape of shapes) {
      const expected = BASE_PROXY_METRICS[shape.name];
      expect(
        shape.unit === expected.unit,
        `${shape.name} unit is '${shape.unit}', expected '${expected.unit}'`,
      );
      expect(
        JSON.stringify(shape.labels) === JSON.stringify(expected.labels),
        `${shape.name} labels are [${shape.labels.join(", ")}], expected [${expected.labels.join(", ")}]`,
      );
    }
  },
);

await check(
  "BP04",
  "proxy_fallback_failure_total{error} is the one label value that changed on purpose: a bounded class, never the message",
  async () => {
    for (const message of [
      "[rate_limit] 429 too many requests",
      "[unavailable] upstream down",
      "free text with api_key=BP04LABELSECRET0123456789",
      undefined,
    ]) {
      recordFallbackAttempt({
        provider: "bp04-provider",
        model: "bp04-model",
        status: "failure",
        durationMs: 0,
        ...(message !== undefined ? { errorMessage: message } : {}),
      });
    }
    const labels = (await collectPoints())
      .filter(
        (point) =>
          point.metric === "proxy_fallback_failure_total" &&
          point.attributes.provider === "bp04-provider",
      )
      .map((point) => String(point.attributes.error))
      .sort();
    expect(
      JSON.stringify(labels) ===
        JSON.stringify(["other", "rate_limit", "unavailable", "unknown"]),
      `label values are [${labels.join(", ")}]`,
    );
  },
);

// ---- Close down --------------------------------------------------------------

await openai.close();
await failingOpenai.close();
await ingest.close();

console.log(failures === 0 ? "SUITE PASS" : `SUITE FAIL ${failures}`);
process.exit(failures === 0 ? 0 : 1);
