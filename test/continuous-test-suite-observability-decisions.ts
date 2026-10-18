#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability decisions (K17, K28, K40)
 *
 * Follow-up to the Langfuse OTEL pipeline (BZ-6924). Three design decisions
 * changed behaviour that earlier follow-up work had already merged; this suite
 * pins the decided behaviour. Every check prints exactly one line,
 * `PROOF <finding> PASS|FAIL <what is checked>`, and the suite exits non-zero
 * when any check fails.
 *
 *   K17  proxy request and response bodies are recorded only when
 *        NEUROLINK_PROXY_TRACE_BODY_LOGGING=true (opt-in, as before PR #2002)
 *   K28  a dropped Langfuse delivery is a signal (result, warn log, health
 *        count) and never opens the registry's circuit breaker
 *   K40  the proxy spans again carry the gen_ai.* model and usage keys and the
 *        `neurolink.proxy` scope for collectors, while Langfuse still receives
 *        exactly one priced generation per proxied request
 *
 * DETERMINISM EXCEPTION (Critical Rule 15). This suite imports from `src/lib/`
 * and is on the `neurolink/e2e-tests-only` allow list. What it asserts cannot
 * come out of a live call:
 *   - it drives the REAL Claude and Codex proxy routes (`createProxyStartApp`)
 *     and a real `NeuroLink` for the translated path against recorded upstream
 *     replies and a local OpenAI-compatible server, so usage, model names and
 *     bodies are fixed;
 *   - two local OTLP receivers decode exactly what leaves the process: the
 *     Langfuse endpoint (NeuroLink's own exporter, mask and all) and the
 *     collector endpoint (`OTEL_EXPORTER_OTLP_ENDPOINT`, the OpenTelemetry
 *     BatchSpanProcessor), so "Langfuse receives one priced generation" and
 *     "the collector still receives the gen_ai.* keys" are read off the wire;
 *   - an outage, a recovery and a span that ends the instant after it need a
 *     Langfuse endpoint that can be switched between failing and healthy.
 * Everything is imported from `src`; nothing is imported from `dist`.
 *
 * Offline: every server is on 127.0.0.1 and no key or provider is contacted.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-observability-decisions.ts
 */
import "./helpers/credentialFreeEnv.js";
import "./helpers/proxyTestIsolation.js";
import type { JsonValue } from "../src/lib/types/common.js";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

type Attr = string | number | boolean;
type SeenSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  scope: string;
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
// Local OTLP/HTTP JSON receiver. One instance plays Langfuse, one the collector.
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

type Receiver = {
  url: string;
  seen: SeenSpan[];
  posts: () => number;
  reset: () => void;
  /** Status the receiver answers span posts with; health checks always pass. */
  respondWith: (status: number) => void;
  close: () => Promise<void>;
};

async function startReceiver(): Promise<Receiver> {
  const seen: SeenSpan[] = [];
  let status = 200;
  let posts = 0;
  const server: Server = createServer(
    (req: IncomingMessage, res: ServerResponse) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const isSpanPost =
          req.method === "POST" && (req.url ?? "").includes("/traces");
        if (isSpanPost) {
          posts += 1;
        }
        const answer = isSpanPost ? status : 200;
        if (isSpanPost && answer === 200) {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
              resourceSpans?: Array<{
                scopeSpans?: Array<{
                  scope?: { name?: string };
                  spans?: OtlpSpanJson[];
                }>;
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
                    scope: scope.scope?.name ?? "",
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
        }
        res.writeHead(answer, { "content-type": "application/json" });
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
    posts: () => posts,
    reset: () => {
      seen.length = 0;
    },
    respondWith: (next) => {
      status = next;
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

const langfuse = await startReceiver();
const collector = await startReceiver();
process.env.LANGFUSE_PUBLIC_KEY = "pk-decisions";
process.env.LANGFUSE_SECRET_KEY = "sk-decisions";
process.env.LANGFUSE_BASE_URL = langfuse.url;
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = collector.url;
process.env.NEUROLINK_SKIP_MCP = "true";
delete process.env.NEUROLINK_PROXY_TRACE_BODY_LOGGING;
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
    publicKey: "pk-decisions",
    secretKey: "sk-decisions",
    baseUrl: langfuse.url,
    mask: maskSecrets,
    flushAt: 100,
    flushInterval: 600,
  },
});

const { ExporterRegistry } =
  await import("../src/lib/observability/exporterRegistry.js");
const { ExporterSpanProcessor } =
  await import("../src/lib/observability/exporterSpanProcessor.js");
const { BaseExporter } =
  await import("../src/lib/observability/exporters/baseExporter.js");
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
const { observe } = await import("../src/lib/telemetry/observation.js");
const { logger } = await import("../src/lib/utils/logger.js");
const { SpanStatus, SpanType } = await import("../src/lib/types/index.js");
type SpanData = import("../src/lib/types/index.js").SpanData;
type ExportResult = import("../src/lib/types/index.js").ExportResult;
type ExporterHealthStatus =
  import("../src/lib/types/index.js").ExporterHealthStatus;
initRequestLogger(false);

expect(
  getLangfuseHealthStatus().isHealthy,
  "Langfuse exporter did not start for the proof run",
);

/** Pushes buffered spans to both receivers and waits until `ready` holds. */
async function settle(ready: () => boolean = () => true): Promise<void> {
  const deadline = Date.now() + 8_000;
  do {
    await flushOpenTelemetry();
    if (ready()) {
      return;
    }
    await pause(25);
  } while (Date.now() < deadline);
  throw new Error("expected spans did not reach the receivers");
}

const text = (s: SeenSpan | undefined, key: string): string =>
  s === undefined ? "" : String(s.attrs[key] ?? "");
const inputOf = (s: SeenSpan | undefined) =>
  text(s, "langfuse.observation.input");
const outputOf = (s: SeenSpan | undefined) =>
  text(s, "langfuse.observation.output");
const observationType = (s: SeenSpan) => text(s, "langfuse.observation.type");
const generationsOf = (spans: SeenSpan[]) =>
  spans.filter((s) => observationType(s) === "generation");
const rootOf = (spans: SeenSpan[]) =>
  spans.find((s) => s.name === "proxy.request");

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

type FixtureKind = "claude-json" | "claude-stream" | "codex" | "translated";

type Fixture = {
  kind: FixtureKind;
  session: string;
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
    session: `session-${kind}-${sequence}`,
    request: `${KEEP}-REQ-${tag} ${MASK}-REQ-${tag}`,
    answer: `${KEEP}-RESP-${tag} ${MASK}-RESP-${tag}`,
  };
}

const delegate = globalThis.fetch;

async function withProxy(
  f: Fixture,
  neurolink: InstanceType<typeof NeuroLink> | undefined,
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
      neurolink: (neurolink ?? {
        getToolRegistry: () => ({}),
      }) as Parameters<typeof createProxyStartApp>[0]["neurolink"],
      modelRouter: translated
        ? {
            resolve: () => ({ provider: "openai", model: "gpt-4o-mini" }),
            isClaudeTarget: () => false,
            getFallbackChain: () => [],
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
          "x-neurolink-user-id": `user-${f.session}`,
          "x-neurolink-session-id": f.session,
          "x-neurolink-conversation-id": `conversation-${f.session}`,
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

type Observed = {
  f: Fixture;
  /** Everything the Langfuse endpoint received for the request. */
  toLangfuse: SeenSpan[];
  /** Everything the collector endpoint received for the request. */
  toCollector: SeenSpan[];
};
type Outcome = { ok: true; value: Observed } | { ok: false; reason: string };

/** Sends one request through the real route and returns what both endpoints got. */
async function exercise(
  f: Fixture,
  neurolink?: InstanceType<typeof NeuroLink>,
): Promise<Observed> {
  langfuse.reset();
  collector.reset();
  let status = 0;
  await withProxy(f, neurolink, async (response) => {
    status = response.status;
    await response.text();
  });
  expect(status === 200, "the proxy did not answer the fixture request");
  const rootAt = (spans: SeenSpan[]) =>
    spans.find(
      (s) =>
        s.name === "proxy.request" &&
        (s.attrs["neurolink.session_id"] === f.session ||
          s.attrs["session.id"] === f.session),
    );
  await settle(
    () =>
      rootAt(langfuse.seen) !== undefined &&
      rootAt(collector.seen) !== undefined &&
      generationsOf(langfuse.seen).length > 0,
  );
  const langfuseRoot = rootAt(langfuse.seen);
  const collectorRoot = rootAt(collector.seen);
  expect(langfuseRoot !== undefined, "no proxy.request reached Langfuse");
  expect(collectorRoot !== undefined, "no proxy.request reached the collector");
  const inTrace = (spans: SeenSpan[], traceId: string) =>
    spans.filter((s) => s.traceId === traceId);
  return {
    f,
    toLangfuse:
      f.kind === "translated"
        ? [...langfuse.seen]
        : inTrace(langfuse.seen, langfuseRoot.traceId),
    toCollector: inTrace(collector.seen, collectorRoot.traceId),
  };
}

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

/** Every tag from the fixture's request and answer, readable and masked. */
function bodiesIn(o: Observed): string[] {
  const tag = o.f.request.split(" ")[0].replace(`${KEEP}-REQ-`, "");
  const serialized = JSON.stringify([o.toLangfuse, o.toCollector]);
  return [
    `${KEEP}-REQ-${tag}`,
    `${KEEP}-RESP-${tag}`,
    `${MASK}-REQ-${tag}`,
    `${MASK}-RESP-${tag}`,
  ].filter((needle) => serialized.includes(needle));
}

// ---------------------------------------------------------------------------
// Scenarios. Each runs once; several checks read the same wire records.
// ---------------------------------------------------------------------------

const KINDS = ["claude-json", "claude-stream", "codex"] as const;
const LABEL: Record<(typeof KINDS)[number], string> = {
  "claude-json": "Claude JSON",
  "claude-stream": "Claude stream",
  codex: "Codex",
};

const byDefault: Record<string, Outcome> = {};
for (const kind of KINDS) {
  byDefault[kind] = await attempt(() => exercise(fixture(kind)));
}

const optedIn: Record<string, Outcome> = {};
await underEnv({ NEUROLINK_PROXY_TRACE_BODY_LOGGING: "true" }, async () => {
  for (const kind of KINDS) {
    optedIn[kind] = await attempt(() => exercise(fixture(kind)));
  }
});

const optedInNoInputs: Record<string, Outcome> = {};
await underEnv(
  {
    NEUROLINK_PROXY_TRACE_BODY_LOGGING: "true",
    NEUROLINK_RECORD_INPUTS: "false",
  },
  async () => {
    for (const kind of ["claude-json", "codex"] as const) {
      optedInNoInputs[kind] = await attempt(() => exercise(fixture(kind)));
    }
  },
);

let notTrue: Outcome = { ok: false, reason: "not run" };
await underEnv({ NEUROLINK_PROXY_TRACE_BODY_LOGGING: "1" }, async () => {
  notTrue = await attempt(() => exercise(fixture("claude-json")));
});

const unsetAgain = await attempt(() => exercise(fixture("claude-json")));

const openai = await startOpenAI();
const translatedNeuroLink = new NeuroLink({
  credentials: { openai: { apiKey: "proof-key", baseURL: openai.baseURL } },
});
const translated = await attempt(() =>
  exercise(fixture("translated"), translatedNeuroLink),
);

// ---- K17: bodies are opt-in ------------------------------------------------

for (const kind of KINDS) {
  await check(
    "K17",
    `${LABEL[kind]}: with NEUROLINK_PROXY_TRACE_BODY_LOGGING unset no body reaches Langfuse or the collector, and usage is still recorded`,
    () => {
      const seen = seenIn(byDefault[kind]);
      const root = rootOf(seen.toLangfuse);
      const generation = generationsOf(seen.toLangfuse)[0];
      expect(root !== undefined && generation !== undefined, "no records");
      expect(
        inputOf(root) === "" &&
          outputOf(root) === "" &&
          inputOf(generation) === "" &&
          outputOf(generation) === "",
        "a request or response body was recorded by default",
      );
      expect(
        bodiesIn(seen).length === 0,
        "body text appears on the wire by default",
      );
      const usage = numbers(generation, "langfuse.observation.usage_details");
      expect((usage.input ?? 0) > 0, "usage disappeared with bodies off");
    },
  );
}

for (const kind of KINDS) {
  await check(
    "K17",
    `${LABEL[kind]}: with NEUROLINK_PROXY_TRACE_BODY_LOGGING=true request and response reach the root and the generation, masked; the raw body event is outside the mask, as in the released build`,
    () => {
      const seen = seenIn(optedIn[kind]);
      const root = rootOf(seen.toLangfuse);
      const generation = generationsOf(seen.toLangfuse)[0];
      expect(root !== undefined && generation !== undefined, "no records");
      expect(
        inputOf(root).includes(`${KEEP}-REQ`) &&
          outputOf(root).includes(`${KEEP}-RESP`) &&
          inputOf(generation).includes(`${KEEP}-REQ`) &&
          outputOf(generation).includes(`${KEEP}-RESP`),
        "the opt-in did not record the request and the response",
      );
      expect(
        inputOf(root).includes("[masked]") &&
          outputOf(root).includes("[masked]"),
        "the bodies were not masked",
      );
      expect(
        !inputOf(root).includes(MASK) &&
          !outputOf(root).includes(MASK) &&
          !inputOf(generation).includes(MASK) &&
          !outputOf(generation).includes(MASK),
        "a masked token is in an observation's input or output",
      );
    },
  );
}

await check(
  "K17",
  "Claude stream: the parsed response is the recorded output, not the raw SSE text",
  () => {
    const root = rootOf(seenIn(optedIn["claude-stream"]).toLangfuse);
    expect(root !== undefined, "no proxy.request root");
    const output = outputOf(root);
    expect(output.includes(`${KEEP}-RESP`), "the response text is missing");
    expect(
      !output.includes("message_start") && !output.includes("event:"),
      "the recorded output is the raw SSE stream",
    );
  },
);

for (const kind of ["claude-json", "codex"] as const) {
  await check(
    "K17",
    `${LABEL[kind]}: NEUROLINK_RECORD_INPUTS=false drops the request body and keeps the response when bodies are opted in`,
    () => {
      const seen = seenIn(optedInNoInputs[kind]);
      const root = rootOf(seen.toLangfuse);
      const generation = generationsOf(seen.toLangfuse)[0];
      expect(root !== undefined && generation !== undefined, "no records");
      expect(
        inputOf(root) === "" && inputOf(generation) === "",
        "the request body was recorded",
      );
      expect(
        outputOf(root).includes(`${KEEP}-RESP`) &&
          outputOf(generation).includes(`${KEEP}-RESP`),
        "the response disappeared with the input opt-out",
      );
      const requestBody = bodiesIn(seen).filter((needle) =>
        needle.includes("-REQ-"),
      );
      expect(requestBody.length === 0, "request text is on the wire");
    },
  );
}

await check("K17", "a value other than true (1) keeps bodies off", () => {
  const seen = seenIn(notTrue);
  expect(
    generationsOf(seen.toLangfuse).length === 1,
    "the request left no generation",
  );
  expect(bodiesIn(seen).length === 0, "bodies were recorded for a 1");
});

await check(
  "K17",
  "the flag is read per request: bodies are off, on, then off again in one process",
  () => {
    const before = seenIn(byDefault["claude-json"]);
    const during = seenIn(optedIn["claude-json"]);
    const after = seenIn(unsetAgain);
    expect(bodiesIn(before).length === 0, "bodies recorded before the flag");
    expect(
      inputOf(rootOf(during.toLangfuse)).includes(`${KEEP}-REQ`),
      "bodies not recorded once the flag was set",
    );
    expect(bodiesIn(after).length === 0, "bodies recorded after it was unset");
  },
);

// ---- K40: dual-written names, scope, and one priced generation -------------

const PRICED_KEYS = [
  "gen_ai.request.model",
  "gen_ai.response.model",
  "gen_ai.usage.input_tokens",
  "gen_ai.usage.output_tokens",
  "gen_ai.usage.total_tokens",
] as const;
const PROXY_COUNTERPART: Record<(typeof PRICED_KEYS)[number], string> = {
  "gen_ai.request.model": "proxy.request.model",
  "gen_ai.response.model": "proxy.response.model",
  "gen_ai.usage.input_tokens": "proxy.usage.input_tokens",
  "gen_ai.usage.output_tokens": "proxy.usage.output_tokens",
  "gen_ai.usage.total_tokens": "proxy.usage.total_tokens",
};

for (const kind of KINDS) {
  await check(
    "K40",
    `${LABEL[kind]}: the collector receives gen_ai model and usage keys on proxy.request next to the proxy.* ones`,
    () => {
      const root = rootOf(seenIn(byDefault[kind]).toCollector);
      expect(root !== undefined, "no proxy.request at the collector");
      for (const key of PRICED_KEYS) {
        const counterpart = PROXY_COUNTERPART[key];
        expect(
          root.attrs[counterpart] !== undefined,
          "the proxy.* key is missing",
        );
        expect(
          root.attrs[key] === root.attrs[counterpart],
          `${key} is missing or differs from ${counterpart}`,
        );
      }
      expect(
        (root.attrs["gen_ai.usage.output_tokens"] as number) > 0,
        "no output tokens",
      );
    },
  );
}

// No route calls ProxyTracer.startStream() today, but the method is part of the
// tracer's API and carried gen_ai.request.model before PR #2002, so it is driven
// directly: the real tracer, on the same provider the routes use.
const { ProxyTracer } = await import("../src/lib/proxy/proxyTracer.js");
const streamProbe = await attempt(async () => {
  const f = fixture("claude-stream");
  langfuse.reset();
  collector.reset();
  const tracer = ProxyTracer.startRequest(
    {
      requestId: `stream-probe-${f.session}`,
      method: "POST",
      path: "/v1/messages",
      model: CLAUDE_MODEL,
      stream: true,
      toolCount: 0,
    },
    { "x-neurolink-session-id": f.session },
  );
  tracer.startStream().end();
  tracer.end(200, 1);
  await settle(() => collector.seen.some((s) => s.name === "proxy.stream"));
  return {
    f,
    toLangfuse: [...langfuse.seen],
    toCollector: [...collector.seen],
  };
});

await check(
  "K40",
  "the collector receives gen_ai.request.model on the proxy.stream span, and Langfuse is not sent that span",
  () => {
    const seen = seenIn(streamProbe);
    const stream = seen.toCollector.find((s) => s.name === "proxy.stream");
    expect(stream !== undefined, "no proxy.stream at the collector");
    expect(
      stream.attrs["gen_ai.request.model"] === CLAUDE_MODEL &&
        stream.attrs["proxy.request.model"] === CLAUDE_MODEL,
      "the stream span lacks gen_ai.request.model",
    );
    expect(
      !seen.toLangfuse.some((s) => s.name === "proxy.stream"),
      "Langfuse was sent the proxy.stream span",
    );
  },
);

await check(
  "K40",
  "the proxy.request root is on the neurolink.proxy scope at the collector; the Langfuse request names the scope sdk",
  () => {
    const seen = seenIn(byDefault["claude-json"]);
    expect(
      rootOf(seen.toCollector)?.scope === "neurolink.proxy",
      "the collector sees another scope",
    );
    expect(
      rootOf(seen.toLangfuse)?.scope === "sdk",
      "the Langfuse request names another scope",
    );
  },
);

const PRICING_FIELDS = [
  "langfuse.observation.model.name",
  "langfuse.observation.usage_details",
  "langfuse.observation.cost_details",
  ...PRICED_KEYS,
];

for (const kind of [...KINDS, "translated"] as const) {
  const outcome = kind === "translated" ? translated : byDefault[kind];
  const label = kind === "translated" ? "Translated" : LABEL[kind];
  await check(
    "K40",
    `${label}: Langfuse receives exactly one priced generation per proxied request`,
    () => {
      const spans = seenIn(outcome).toLangfuse;
      const generations = generationsOf(spans);
      expect(
        generations.length === 1,
        "the trace does not hold one generation",
      );
      const usage = numbers(
        generations[0],
        "langfuse.observation.usage_details",
      );
      const cost = numbers(generations[0], "langfuse.observation.cost_details");
      expect(
        text(generations[0], "langfuse.observation.model.name") !== "" &&
          (usage.input ?? 0) > 0 &&
          (cost.total ?? 0) > 0,
        "the generation lacks model, usage or cost",
      );
      const others = spans
        .filter((s) => s.spanId !== generations[0].spanId)
        .filter((s) => PRICING_FIELDS.some((key) => s.attrs[key] !== undefined))
        .map((s) => s.name);
      expect(
        others.length === 0,
        `another record carries model, usage or cost: ${others.join(", ")}`,
      );
    },
  );
}

for (const kind of KINDS) {
  await check(
    "K40",
    `${LABEL[kind]}: the proxy.request root sent to Langfuse has no model, usage or cost field`,
    () => {
      const root = rootOf(seenIn(byDefault[kind]).toLangfuse);
      expect(root !== undefined, "no proxy.request at Langfuse");
      const present = PRICING_FIELDS.filter(
        (key) => root.attrs[key] !== undefined,
      );
      expect(present.length === 0, `the root carries ${present.join(", ")}`);
      expect(
        root.attrs["proxy.usage.input_tokens"] !== undefined &&
          root.attrs["proxy.request.model"] !== undefined,
        "the proxy.* keys went missing",
      );
    },
  );
}

await check(
  "K40",
  "Langfuse still receives only the proxy.request root and the generation for a proxied request",
  () => {
    for (const kind of KINDS) {
      const names = [
        ...new Set(seenIn(byDefault[kind]).toLangfuse.map((s) => s.name)),
      ].sort();
      expect(
        names.length === 2 &&
          names.includes("proxy.request") &&
          names.some((name) => name !== "proxy.request"),
        `the export set changed for ${kind}`,
      );
    }
  },
);

// ---- K40: the exporter keeps unpriced observations unpriced --------------------

class RecordingExporter extends BaseExporter {
  readonly spans: SpanData[] = [];

  constructor() {
    super("recorder", { enabled: true });
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    this.spans.push(span);
    return this.createSuccessResult(1, 0);
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
    this.spans.push(...spans);
    return this.createSuccessResult(spans.length, 0);
  }

  async flush(): Promise<void> {}

  async shutdown(): Promise<void> {
    this.initialized = false;
  }

  async healthCheck(): Promise<ExporterHealthStatus> {
    return this.createHealthStatus(true);
  }
}

const GEN_AI_KEYS = {
  "gen_ai.request.model": "model-a",
  "gen_ai.response.model": "model-a",
  "gen_ai.usage.input_tokens": 11,
  "gen_ai.usage.output_tokens": 7,
  "gen_ai.usage.total_tokens": 18,
};

async function exporterRule(): Promise<{
  wire: SeenSpan[];
  recorded: SpanData[];
}> {
  const receiver = await startReceiver();
  const exporter = new LangfuseExporter({
    enabled: true,
    publicKey: "pk-rule",
    secretKey: "sk-rule",
    baseUrl: receiver.url,
    retries: 0,
    maxBufferSize: 10_000,
    flushIntervalMs: 60_000,
  });
  await exporter.initialize();
  const recorder = new RecordingExporter();
  await recorder.initialize();
  const registry = new ExporterRegistry();
  registry.register(exporter);
  registry.register(recorder);
  const processor = new ExporterSpanProcessor(registry);
  const provider = new NodeTracerProvider({ spanProcessors: [processor] });
  try {
    const unpriced = provider.getTracer("sdk").startSpan("rule.unpriced", {
      attributes: GEN_AI_KEYS,
    });
    observe(unpriced, "span", {});
    unpriced.end();
    const generation = provider.getTracer("sdk").startSpan("rule.generation", {
      attributes: GEN_AI_KEYS,
    });
    observe(generation, "generation", {
      model: "model-a",
      usageDetails: { input: 11, output: 7, total: 18 },
    });
    generation.end();
    provider
      .getTracer("@host/ai")
      .startSpan("rule.foreign", { attributes: GEN_AI_KEYS })
      .end();
    const deadline = Date.now() + 3_000;
    while (receiver.seen.length < 3 && Date.now() < deadline) {
      await processor.forceFlush();
      await pause(20);
    }
    return { wire: [...receiver.seen], recorded: [...recorder.spans] };
  } finally {
    await provider.shutdown().catch(() => undefined);
    await exporter.shutdown();
    await receiver.close();
  }
}

const rule = await exporterRule();
const onWire = (name: string) => rule.wire.find((s) => s.name === name);

await check(
  "K40",
  "Langfuse is sent no gen_ai model or usage key for an observation that is not a generation, while another exporter still receives them",
  () => {
    const sent = onWire("rule.unpriced");
    expect(sent !== undefined, "the observation did not reach Langfuse");
    expect(observationType(sent) === "span", "the observation lost its type");
    const present = PRICED_KEYS.filter((key) => sent.attrs[key] !== undefined);
    expect(present.length === 0, `Langfuse is sent ${present.join(", ")}`);
    const other = rule.recorded.find((s) => s.name === "rule.unpriced");
    expect(other !== undefined, "no other exporter received the span");
    expect(
      PRICED_KEYS.every((key) => other.attributes[key] !== undefined),
      "another exporter lost the gen_ai keys",
    );
  },
);

await check(
  "K40",
  "a generation keeps its gen_ai model and usage keys on the way to Langfuse",
  () => {
    const sent = onWire("rule.generation");
    expect(sent !== undefined, "the generation did not reach Langfuse");
    expect(
      PRICED_KEYS.every((key) => sent.attrs[key] === GEN_AI_KEYS[key]),
      "a generation lost its gen_ai keys",
    );
  },
);

await check(
  "K40",
  "a span from another library that carries gen_ai model keys and no observation type is left as it was",
  () => {
    const sent = onWire("rule.foreign");
    expect(sent !== undefined, "the foreign model span did not reach Langfuse");
    expect(
      PRICED_KEYS.every((key) => sent.attrs[key] === GEN_AI_KEYS[key]),
      "the foreign span lost its gen_ai keys",
    );
  },
);

// ---- K28: a dropped delivery is a signal, never a breaker ----------------

const spanCount = { value: 0 };
function spanData(): SpanData {
  spanCount.value += 1;
  const stamp = String(spanCount.value).padStart(16, "0");
  return {
    spanId: stamp,
    traceId: stamp.repeat(2),
    type: SpanType.CUSTOM,
    name: `k28-span-${spanCount.value}`,
    startTime: "2026-01-01T00:00:00.000Z",
    endTime: "2026-01-01T00:00:00.100Z",
    status: SpanStatus.OK,
    attributes: {},
    events: [],
    links: [],
  };
}

async function deliveryRig() {
  const receiver = await startReceiver();
  const exporter = new LangfuseExporter({
    enabled: true,
    publicKey: "pk-k28",
    secretKey: "sk-k28",
    baseUrl: receiver.url,
    retries: 0,
    maxBufferSize: 10_000,
    flushIntervalMs: 60_000,
  });
  await exporter.initialize();
  const registry = new ExporterRegistry();
  registry.register(exporter);
  // A long reset timeout: a span lost to an open breaker cannot be rescued by a
  // half-open probe inside the proof.
  registry.configureCircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 60_000,
  });
  const processor = new ExporterSpanProcessor(registry);
  const provider = new NodeTracerProvider({ spanProcessors: [processor] });
  return {
    receiver,
    exporter,
    registry,
    processor,
    tracer: provider.getTracer("sdk"),
    close: async () => {
      await provider.shutdown().catch(() => undefined);
      await exporter.shutdown();
      await receiver.close();
    },
  };
}

const OUTAGE_SPANS = 6;
const outage = await (async () => {
  const rig = await deliveryRig();
  const warnings: string[] = [];
  const originalWarn = logger.warn;
  logger.warn = (...args: unknown[]) => {
    warnings.push(String(args[0]));
  };
  try {
    rig.receiver.respondWith(500);
    const exportSpanResults: ExportResult[] = [];
    for (let index = 0; index < OUTAGE_SPANS; index++) {
      const results = await rig.registry.exportToAll(spanData());
      const result = results.get("langfuse");
      if (result) {
        exportSpanResults.push(result);
      }
      await rig.exporter.flush();
    }
    const breaker = rig.registry.getCircuitBreakerStatus("langfuse");
    const health = await rig.exporter.healthCheck();

    rig.receiver.respondWith(200);
    rig.receiver.reset();
    // The span ends the instant after the outage does: no waiting period.
    const recovered = rig.tracer.startSpan("k28-after-recovery");
    observe(recovered, "span", {});
    recovered.end();
    const deadline = Date.now() + 3_000;
    while (
      !rig.receiver.seen.some((s) => s.name === "k28-after-recovery") &&
      Date.now() < deadline
    ) {
      await rig.processor.forceFlush();
      await pause(20);
    }
    return {
      exportSpanResults,
      breaker,
      healthErrors: health.errors ?? [],
      warnings: [...warnings],
      arrived: rig.receiver.seen.some((s) => s.name === "k28-after-recovery"),
    };
  } finally {
    logger.warn = originalWarn;
    await rig.close();
  }
})();

await check(
  "K28",
  "exportSpan reports success for the buffer step while the latest delivery dropped a chunk",
  () => {
    expect(
      outage.exportSpanResults.length === OUTAGE_SPANS,
      "the registry did not call the exporter for every span",
    );
    const failed = outage.exportSpanResults.filter((r) => !r.success);
    expect(
      failed.length === 0,
      `${failed.length} of ${OUTAGE_SPANS} exportSpan calls reported a failure`,
    );
  },
);

await check(
  "K28",
  "repeated dropped deliveries leave the registry's circuit breaker closed",
  () => {
    const state = outage.breaker;
    expect(
      state === undefined || (state.state === "closed" && state.failures === 0),
      "the breaker recorded a failure or opened",
    );
  },
);

await check(
  "K28",
  "a span that ends right after an outage ends is buffered and delivered",
  () => {
    expect(outage.arrived, "the span never reached Langfuse");
  },
);

await check(
  "K28",
  "the dropped spans are still counted in the health check and warned about",
  () => {
    expect(
      outage.healthErrors.some((message) =>
        new RegExp(`${OUTAGE_SPANS} spans dropped`).test(message),
      ),
      "the health check does not count the dropped spans",
    );
    expect(
      outage.warnings.some((message) => /Dropped 1 of 1 spans/.test(message)),
      "no warn-level log states the drop",
    );
  },
);

for (const status of [401, 403]) {
  await check(
    "K28",
    `exportBatch still reports a non-retryable ${status} rejection as failed spans`,
    async () => {
      const rig = await deliveryRig();
      try {
        rig.receiver.respondWith(status);
        const result = await rig.exporter.exportBatch([spanData(), spanData()]);
        expect(
          result.success === false &&
            result.failedCount === 2 &&
            result.exportedCount === 0 &&
            (result.errors ?? []).length === 2,
          "the rejection was not reported with counts and per-span errors",
        );
      } finally {
        await rig.close();
      }
    },
  );
}

// ---------------------------------------------------------------------------

await openai.close();
await langfuse.close();
await collector.close();

console.log(failures === 0 ? "SUITE PASS" : `SUITE FAIL ${failures}`);
process.exit(failures === 0 ? 0 : 1);
