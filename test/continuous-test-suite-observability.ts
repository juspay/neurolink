#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability
 *
 * Drives the public `NeuroLink` surface against local fake upstreams (an
 * OpenAI-compatible chat-completions server, an Anthropic Messages endpoint, a
 * Laya decision endpoint and a Langfuse OTLP receiver) and reads the spans a
 * real `LangfuseSpanProcessor` exports, which is what Langfuse would receive
 * from a host provider, and the OTLP JSON requests NeuroLink's own exporter
 * pipeline posts when it owns the provider.
 * The host registers its own TracerProvider before `dist` loads, so NeuroLink
 * takes the external-provider path; the owned-provider path runs in child
 * processes because a global provider can be registered once.
 *
 * No keys and no live calls are needed.
 *
 * Run: pnpm run test:observability
 */
import "./helpers/credentialFreeEnv.js";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  type ReadableSpan,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  assert,
  assertEqual,
  defineSuite,
  runCommand,
  tempDir,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import type { GenerateOptions } from "../dist/index.js";

assertDistFresh();

type Json =
  | string
  | number
  | boolean
  | null
  | undefined
  | Json[]
  | { [key: string]: Json };
type JsonBody = { [key: string]: Json };
type RequestExtra = Record<
  string,
  object | string | number | boolean | undefined
>;

process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
process.env.LANGFUSE_SECRET_KEY = "sk-test";
process.env.LANGFUSE_TRACING_ENVIRONMENT = "test-env";
process.env.LANGFUSE_RELEASE = "test-release";
process.env.NEUROLINK_SKIP_MCP = "true";

const langfuseSpans = new InMemorySpanExporter();
const allSpans = new InMemorySpanExporter();
const hostProvider = new NodeTracerProvider({
  spanProcessors: [
    new LangfuseSpanProcessor({
      exporter: langfuseSpans,
      exportMode: "immediate",
    }),
    new SimpleSpanProcessor(allSpans),
  ],
});
hostProvider.register();

const {
  AIProviderFactory,
  NeuroLink,
  getLangfuseHealthStatus,
  jsonSchema,
  setLangfuseContext,
} = await import("../dist/index.js");

const { test, section, runSuite } = defineSuite("Observability", {
  offline: true,
  perTestTimeoutMs: 60_000,
});

const USER = "user-1";
const SESSION = "session-1";
const TAG = "tag-1";
const context = {
  userId: USER,
  sessionId: SESSION,
  tags: [TAG],
  metadata: { feature: "obs" },
};

type Behavior = "text" | "tool" | "length" | "reject" | "hold";

function behaviorOf(model: string): Behavior {
  switch (model) {
    case "tool-model":
      return "tool";
    case "length-model":
      return "length";
    case "reject-model":
      return "reject";
    case "hold-model":
      return "hold";
    default:
      return "text";
  }
}

function readBody(req: IncomingMessage): Promise<JsonBody> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    }),
  );
}

function closeServer(server: Server, held: Set<ServerResponse>): Promise<void> {
  return new Promise((resolve) => {
    for (const response of held) {
      response.destroy();
    }
    server.close(() => resolve());
  });
}

type FakeUpstream = {
  port: number;
  baseURL: string;
  requests: JsonBody[];
  close: () => Promise<void>;
};

function chunkFrame(model: string, delta: object, finish: string | null) {
  return `data: ${JSON.stringify({
    id: "chatcmpl-fake",
    object: "chat.completion.chunk",
    created: 1,
    model,
    choices: [{ index: 0, delta, finish_reason: finish }],
  })}\n\n`;
}

const LOOKUP_ARGS = { q: "needle" };
const LOOKUP_ARGS_JSON = JSON.stringify(LOOKUP_ARGS);

const TOOL_CALL = {
  id: "call_1",
  type: "function",
  function: { name: "lookup", arguments: LOOKUP_ARGS_JSON },
};

function chatBody(model: string, behavior: Behavior, toolDone: boolean) {
  const calling = behavior === "tool" && !toolDone;
  return {
    id: "chatcmpl-fake",
    object: "chat.completion",
    created: 1,
    model,
    choices: [
      {
        index: 0,
        message: calling
          ? { role: "assistant", content: null, tool_calls: [TOOL_CALL] }
          : { role: "assistant", content: "hello there" },
        finish_reason: calling
          ? "tool_calls"
          : behavior === "length"
            ? "length"
            : "stop",
      },
    ],
    usage: {
      prompt_tokens: 12,
      completion_tokens: 5,
      total_tokens: 17,
      prompt_tokens_details: { cached_tokens: 3 },
      completion_tokens_details: { reasoning_tokens: 2 },
    },
  };
}

function streamChat(
  res: ServerResponse,
  model: string,
  behavior: Behavior,
  toolDone: boolean,
  held: Set<ServerResponse>,
): void {
  res.writeHead(200, { "content-type": "text/event-stream" });
  if (behavior === "tool" && !toolDone) {
    res.write(
      chunkFrame(
        model,
        { role: "assistant", tool_calls: [{ index: 0, ...TOOL_CALL }] },
        null,
      ),
    );
    res.write(chunkFrame(model, {}, "tool_calls"));
  } else {
    res.write(chunkFrame(model, { role: "assistant", content: "hel" }, null));
    if (behavior === "hold") {
      held.add(res);
      res.on("close", () => held.delete(res));
      return;
    }
    setTimeout(() => {
      res.write(chunkFrame(model, { content: "lo" }, null));
      res.write(
        chunkFrame(model, {}, behavior === "length" ? "length" : "stop"),
      );
      res.write(
        `data: ${JSON.stringify({
          id: "chatcmpl-fake",
          object: "chat.completion.chunk",
          created: 1,
          model,
          choices: [],
          usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 },
        })}\n\n`,
      );
      res.end("data: [DONE]\n\n");
    }, 20);
    return;
  }
  res.write(
    `data: ${JSON.stringify({
      id: "chatcmpl-fake",
      object: "chat.completion.chunk",
      created: 1,
      model,
      choices: [],
      usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
    })}\n\n`,
  );
  res.end("data: [DONE]\n\n");
}

async function startOpenAI(): Promise<FakeUpstream> {
  const requests: JsonBody[] = [];
  const held = new Set<ServerResponse>();
  const server = createServer(async (req, res) => {
    const body = await readBody(req);
    requests.push(body);
    const model = String(body.model ?? "gpt-4o-mini");
    const behavior = behaviorOf(model);
    if (behavior === "reject") {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          error: { message: "rejected", type: "invalid_request_error" },
        }),
      );
      return;
    }
    const toolDone = JSON.stringify(body.messages ?? []).includes(
      "tool_call_id",
    );
    if (body.stream === true) {
      streamChat(res, model, behavior, toolDone, held);
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(chatBody(model, behavior, toolDone)));
  });
  const port = await listen(server);
  return {
    port,
    baseURL: `http://127.0.0.1:${port}/v1`,
    requests,
    close: () => closeServer(server, held),
  };
}

function frame(event: string, payload: JsonBody): string {
  return `event: ${event}\ndata: ${JSON.stringify({ type: event, ...payload })}\n\n`;
}

function anthropicCallsTool(body: JsonBody): boolean {
  return (
    Array.isArray(body.tools) &&
    body.tools.length > 0 &&
    !JSON.stringify(body.messages ?? []).includes("tool_result")
  );
}

function anthropicMessage(body: JsonBody) {
  const calling = anthropicCallsTool(body);
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: body.model,
    content: calling
      ? [
          {
            type: "tool_use",
            id: "toolu_1",
            name: "lookup",
            input: LOOKUP_ARGS,
          },
        ]
      : [{ type: "text", text: "from claude" }],
    stop_reason: calling ? "tool_use" : "end_turn",
    usage: {
      input_tokens: 5,
      output_tokens: 4,
      cache_read_input_tokens: 7,
      cache_creation_input_tokens: 2,
    },
  };
}

function anthropicFrames(body: JsonBody): string[] {
  const calling = anthropicCallsTool(body);
  return [
    frame("message_start", {
      message: {
        id: "msg_1",
        usage: {
          input_tokens: 5,
          output_tokens: 0,
          cache_read_input_tokens: 7,
          cache_creation_input_tokens: 2,
        },
      },
    }),
    frame("content_block_start", {
      index: 0,
      content_block: calling
        ? { type: "tool_use", id: "toolu_1", name: "lookup", input: {} }
        : { type: "text", text: "" },
    }),
    frame("content_block_delta", {
      index: 0,
      delta: calling
        ? { type: "input_json_delta", partial_json: LOOKUP_ARGS_JSON }
        : { type: "text_delta", text: "from claude" },
    }),
    frame("content_block_stop", { index: 0 }),
    frame("message_delta", {
      delta: { stop_reason: calling ? "tool_use" : "end_turn" },
      usage: { output_tokens: 4 },
    }),
    frame("message_stop", {}),
  ];
}

async function startAnthropic(): Promise<FakeUpstream> {
  const requests: JsonBody[] = [];
  const server = createServer(async (req, res) => {
    const body = await readBody(req);
    requests.push(body);
    if (body.stream !== true) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(anthropicMessage(body)));
      return;
    }
    res.writeHead(200, { "content-type": "text/event-stream" });
    for (const entry of anthropicFrames(body)) {
      res.write(entry);
    }
    res.end();
  });
  const port = await listen(server);
  return {
    port,
    baseURL: `http://127.0.0.1:${port}`,
    requests,
    close: () => closeServer(server, new Set()),
  };
}

const LAYA_REPLY = {
  model: "laya-rl-agent",
  answers: {
    urgent: {
      type: "noul",
      noul: 0.91,
      confidence: 0.91,
      action: { act_probability: 0.5 },
    },
  },
  usage: { input_tokens: 96, output_tokens: 0 },
  routing: { model: "typed-decisions", reason: "explicit" },
};

async function startLaya(): Promise<FakeUpstream> {
  const requests: JsonBody[] = [];
  const server = createServer(async (req, res) => {
    requests.push(await readBody(req));
    res.writeHead(200, {
      "content-type": "application/json",
      "x-litellm-call-id": "call-laya-1",
    });
    res.end(JSON.stringify(LAYA_REPLY));
  });
  const port = await listen(server);
  return {
    port,
    baseURL: `http://127.0.0.1:${port}`,
    requests,
    close: () => closeServer(server, new Set()),
  };
}

type OtlpMode = "ok" | "partial" | "flaky" | "unauthorized";
type OtlpHit = {
  path: string;
  authorization: string | undefined;
  headers: Record<string, string | string[] | undefined>;
  status: number;
  spans: DecodedSpan[];
};
type DecodedSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  statusCode: number;
  attributes: JsonBody;
};

function decodeValue(value: JsonBody): Json | undefined {
  if (value.arrayValue) {
    const values = (value.arrayValue as { values?: JsonBody[] }).values;
    return (values ?? []).map(decodeValue);
  }
  if (value.intValue !== undefined) {
    return Number(value.intValue);
  }
  return value.stringValue ?? value.doubleValue ?? value.boolValue;
}

function decodeSpans(payload: JsonBody): DecodedSpan[] {
  type Raw = {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    name: string;
    status: { code: number };
    attributes: { key: string; value: JsonBody }[];
  };
  const resources = (payload.resourceSpans ?? []) as {
    scopeSpans: { spans: Raw[] }[];
  }[];
  return resources
    .flatMap((resource) => resource.scopeSpans)
    .flatMap((scope) => scope.spans)
    .map((span) => ({
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      statusCode: span.status.code,
      attributes: Object.fromEntries(
        span.attributes.map((entry) => [entry.key, decodeValue(entry.value)]),
      ),
    }));
}

async function startLangfuse(mode: OtlpMode = "ok"): Promise<{
  baseUrl: string;
  hits: OtlpHit[];
  sends: Map<string, number>;
  close: () => Promise<void>;
}> {
  const hits: OtlpHit[] = [];
  const sends = new Map<string, number>();
  const server = createServer(async (req, res) => {
    const spans = decodeSpans(await readBody(req));
    const answer = (status: number, body: Json): void => {
      hits.push({
        path: req.url ?? "",
        authorization: req.headers.authorization,
        headers: req.headers,
        status,
        spans,
      });
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (mode === "unauthorized") {
      answer(401, { message: "Invalid credentials" });
      return;
    }
    if (mode === "flaky" && hits.length === 0) {
      answer(500, { message: "boom" });
      return;
    }
    spans.forEach((span) =>
      sends.set(span.spanId, (sends.get(span.spanId) ?? 0) + 1),
    );
    answer(
      200,
      mode === "partial"
        ? {
            partialSuccess: {
              rejectedSpans: "1",
              errorMessage: "invalid span",
            },
          }
        : {},
    );
  });
  const port = await listen(server);
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    hits,
    sends,
    close: () => closeServer(server, new Set()),
  };
}

const seen = new Set<ReadableSpan>();

async function exported(): Promise<ReadableSpan[]> {
  await hostProvider.forceFlush();
  const spans = langfuseSpans.getFinishedSpans();
  spans.forEach((span) => seen.add(span));
  return spans;
}

async function everySpan(): Promise<ReadableSpan[]> {
  await hostProvider.forceFlush();
  const spans = allSpans.getFinishedSpans();
  spans.forEach((span) => seen.add(span));
  return spans;
}

function clear(): void {
  langfuseSpans.reset();
  allSpans.reset();
}

function named(spans: ReadableSpan[], name: string): ReadableSpan[] {
  return spans.filter(
    (span) =>
      span.name === name &&
      span.attributes["langfuse.observation.type"] !== "generation",
  );
}

function only(spans: ReadableSpan[], name: string): ReadableSpan {
  const matches = named(spans, name);
  assertEqual(matches.length, 1, `expected exactly one ${name} span`);
  return matches[0];
}

function ofType(spans: ReadableSpan[], type: string): ReadableSpan[] {
  return spans.filter(
    (span) => span.attributes["langfuse.observation.type"] === type,
  );
}

function text(span: ReadableSpan, key: string): string {
  return String(span.attributes[key] ?? "");
}

function parsed(span: ReadableSpan, key: string): JsonBody {
  const raw = span.attributes[key];
  assert(typeof raw === "string", `${span.name} has no ${key}`);
  return JSON.parse(raw as string) as JsonBody;
}

type ChatMessage = {
  role: string;
  content: Json;
  tool_calls?: Array<{ function: { name: string; arguments?: string } }>;
};

function messages(span: ReadableSpan, key: string): ChatMessage[] {
  const raw = span.attributes[key];
  assert(typeof raw === "string", `${span.name} has no ${key}`);
  const value = JSON.parse(raw as string);
  assert(Array.isArray(value), `${span.name} ${key} is not a message array`);
  for (const message of value) {
    assert(
      typeof message.role === "string",
      `${span.name} ${key} holds a message without a role`,
    );
  }
  return value as ChatMessage[];
}

function assistantText(span: ReadableSpan, key: string): Json | undefined {
  const reply = messages(span, key);
  assertEqual(reply.length, 1, `${span.name} ${key} should be one message`);
  assertEqual(reply[0].role, "assistant");
  return reply[0].content;
}

function level(span: ReadableSpan): Json | undefined {
  return span.attributes["langfuse.observation.level"];
}

function traceIds(spans: ReadableSpan[]): Set<string> {
  return new Set(spans.map((span) => span.spanContext().traceId));
}

async function settle(name: string): Promise<void> {
  let previous = -1;
  for (let attempt = 0; attempt < 40; attempt++) {
    const spans = await exported();
    if (named(spans, name).length > 0 && spans.length === previous) {
      return;
    }
    previous = spans.length;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

const fake = await startOpenAI();
const credentials = { openai: { apiKey: "test-key", baseURL: fake.baseURL } };
const nl = new NeuroLink();

function request(model: string, extra: RequestExtra = {}) {
  return {
    input: { text: "hi" },
    provider: "openai",
    model,
    credentials,
    disableTools: true,
    disableInternalFallback: true,
    context,
    ...extra,
  } as never;
}

function lookupTool(calls: { count: number }) {
  return {
    lookup: {
      description: "look a value up",
      inputSchema: jsonSchema({
        type: "object",
        properties: { q: { type: "string" } },
        additionalProperties: true,
      }),
      execute: async () => {
        calls.count++;
        return { found: true };
      },
    },
  };
}

async function drain<T>(stream: AsyncIterable<T>): Promise<void> {
  for await (const chunk of stream) {
    void chunk;
  }
}

section("generate");

await test("one trace per generate call with root input and output", async () => {
  clear();
  const result = await nl.generate(request("gpt-4o-mini"));
  assertEqual(result.content, "hello there", "generate returned other content");
  const spans = await exported();
  const root = only(spans, "generate");
  assertEqual(text(root, "langfuse.observation.type"), "agent");
  assert(
    text(root, "langfuse.observation.input").includes("hi"),
    "root span has no input",
  );
  assertEqual(
    assistantText(root, "langfuse.observation.output"),
    "hello there",
  );
  assertEqual(traceIds(await everySpan()).size, 1, "call spread over traces");
});

const MODEL_KEYS = [
  "langfuse.observation.model.name",
  "gen_ai.request.model",
  "gen_ai.response.model",
  "langfuse.observation.usage_details",
  "langfuse.observation.cost_details",
];

function assertOnlyModelCallsCarryModel(spans: ReadableSpan[]): void {
  const generations = ofType(spans, "generation");
  assert(generations.length > 0, "expected at least one generation");
  for (const generation of generations) {
    assert(
      generation.attributes["langfuse.observation.model.name"] !== undefined,
      `${generation.name} lost its model`,
    );
  }
  for (const span of spans) {
    const type = span.attributes["langfuse.observation.type"];
    if (type === "generation" || type === "embedding") {
      continue;
    }
    const leaked = Object.keys(span.attributes).filter(
      (key) => MODEL_KEYS.includes(key) || key.startsWith("gen_ai.usage."),
    );
    assertEqual(leaked.length, 0, `${span.name} carries model or usage`);
  }
}

await test("a generate carries model, usage and cost on generations only", async () => {
  clear();
  await nl.generate(request("gpt-4o-mini"));
  assertOnlyModelCallsCarryModel(await exported());
});

await test("a stream carries model, usage and cost on generations only", async () => {
  clear();
  const result = await nl.stream(request("gpt-4o-mini"));
  await drain(result.stream);
  assertOnlyModelCallsCarryModel(await exported());
});

await test("exactly one generation per model request with full usage and cost", async () => {
  clear();
  await nl.generate(request("gpt-4o-mini"));
  const spans = await exported();
  const generations = ofType(spans, "generation");
  assertEqual(generations.length, 1, "expected a single generation");
  const generation = generations[0];
  assertEqual(generation.name, "generate");
  assertEqual(
    text(generation, "langfuse.observation.metadata.provider"),
    "openai",
  );
  assertEqual(
    text(generation, "langfuse.observation.model.name"),
    "gpt-4o-mini",
  );
  assert(
    "maxTokens" in parsed(generation, "langfuse.observation.model.parameters"),
    "model parameters were not recorded",
  );
  const usage = parsed(generation, "langfuse.observation.usage_details");
  assertEqual(usage.output, 5, "output tokens");
  assertEqual(usage.cache_read_input_tokens, 3, "cache read tokens");
  assertEqual(usage.reasoning, 2, "reasoning tokens");
  const cost = parsed(generation, "langfuse.observation.cost_details");
  assert(Number(cost.total) > 0, "cost was not recorded");
  assert(
    text(generation, "langfuse.observation.input").includes("hi"),
    "generation has no input",
  );
  assert(
    text(generation, "langfuse.observation.output").includes("hello there"),
    "generation has no output",
  );
});

await test("an env-style secret in a prompt is redacted on the generation input", async () => {
  clear();
  await nl.generate(
    request("gpt-4o-mini", {
      input: {
        text: "deploy with OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz012345 and DB_PASSWORD=hunter2hunter2",
      },
    }),
  );
  const generation = ofType(await exported(), "generation")[0];
  const input = text(generation, "langfuse.observation.input");
  assert(input.includes("[REDACTED]"), "generation input was not redacted");
  assert(!input.includes("abcdefghijklmnop"), "api key reached the span");
  assert(!input.includes("hunter2"), "password reached the span");
});

await test("a base64 data URL in a prompt is replaced by a size placeholder", async () => {
  clear();
  await nl.generate(
    request("gpt-4o-mini", {
      input: {
        text: `look at data:image/png;base64,${"QUJD".repeat(500)} please`,
      },
    }),
  );
  const generation = ofType(await exported(), "generation")[0];
  const input = text(generation, "langfuse.observation.input");
  assert(input.includes("[1500 bytes image/png]"), "no media placeholder");
  assert(!input.includes("QUJDQUJD"), "base64 payload reached the span");
});

await test("user, session, tags and metadata ride on every span through the @langfuse/otel processor", async () => {
  clear();
  await nl.generate(request("gpt-4o-mini"));
  const spans = await everySpan();
  assert(spans.length > 1, "expected more than the root span");
  for (const span of spans) {
    assertEqual(span.attributes["user.id"], USER, `${span.name} user.id`);
    assertEqual(
      span.attributes["session.id"],
      SESSION,
      `${span.name} session.id`,
    );
    assertEqual(
      String(span.attributes["langfuse.trace.tags"]),
      TAG,
      `${span.name} tags`,
    );
    assertEqual(
      span.attributes["langfuse.trace.metadata.feature"],
      "obs",
      `${span.name} metadata`,
    );
  }
});

await test("environment and release come from the environment on every span through the @langfuse/otel processor", async () => {
  clear();
  await nl.generate(request("gpt-4o-mini"));
  for (const span of await everySpan()) {
    assertEqual(span.attributes["langfuse.environment"], "test-env");
    assertEqual(span.attributes["langfuse.release"], "test-release");
  }
});

await test("setLangfuseContext propagates attributes without a context option", async () => {
  clear();
  await setLangfuseContext(
    { userId: "ctx-user", sessionId: "ctx-session" },
    () => nl.generate(request("gpt-4o-mini", { context: undefined })),
  );
  const root = only(await exported(), "generate");
  assertEqual(root.attributes["user.id"], "ctx-user");
  assertEqual(root.attributes["session.id"], "ctx-session");
});

await test("a failed attempt and its fallback stay in one trace", async () => {
  clear();
  const result = await nl.generate(
    request("reject-model", {
      providerFallback: async () => ({
        provider: "openai",
        model: "gpt-4o-mini",
      }),
    }),
  );
  assertEqual(result.content, "hello there", "fallback did not answer");
  const spans = await exported();
  const generations = ofType(spans, "generation");
  assertEqual(generations.length, 2, "expected one generation per request");
  const failed = generations.find(
    (span) => text(span, "langfuse.observation.model.name") === "reject-model",
  );
  assert(failed !== undefined, "failed generation was not exported");
  assertEqual(failed?.status.code, 2, "failed generation is not an error");
  assertEqual(named(spans, "generate.attempt").length, 2);
  assertEqual(traceIds(spans).size, 1, "attempts spread over traces");
  assertEqual(only(spans, "generate").status.code, 1);
});

await test("a length finish marks the generation and the root WARNING", async () => {
  clear();
  await nl.generate(request("length-model"));
  const spans = await exported();
  assertEqual(level(ofType(spans, "generation")[0]), "WARNING");
  assertEqual(level(only(spans, "generate")), "WARNING");
});

section("stream");

await test("a stream records one generation with first-token time and usage", async () => {
  clear();
  const result = await nl.stream(request("gpt-4o-mini"));
  await drain(result.stream);
  const spans = await exported();
  const root = only(spans, "stream");
  assertEqual(assistantText(root, "langfuse.observation.output"), "hello");
  assertEqual(root.status.code, 1, "root did not finish OK");
  const generations = ofType(spans, "generation");
  assertEqual(generations.length, 1, "expected a single generation");
  const generation = generations[0];
  assert(
    generation.attributes["langfuse.observation.completion_start_time"] !==
      undefined,
    "completion start time was not recorded",
  );
  const usage = parsed(generation, "langfuse.observation.usage_details");
  assertEqual(usage.input, 12, "input tokens");
  assertEqual(usage.output, 5, "output tokens");
  assert(
    text(generation, "langfuse.observation.output").includes("hello"),
    "generation has no output",
  );
  assert(
    named(spans, "stream.attempt").length === 1,
    "expected one attempt span",
  );
  assertEqual(traceIds(await everySpan()).size, 1, "call spread over traces");
});

await test("stream spans carry user, session and tags", async () => {
  clear();
  const result = await nl.stream(request("gpt-4o-mini"));
  await drain(result.stream);
  for (const span of await everySpan()) {
    assertEqual(span.attributes["user.id"], USER, `${span.name} user.id`);
    assertEqual(
      span.attributes["session.id"],
      SESSION,
      `${span.name} session.id`,
    );
    assertEqual(String(span.attributes["langfuse.trace.tags"]), TAG);
  }
});

await test("a length finish on a stream marks the generation WARNING", async () => {
  clear();
  const result = await nl.stream(request("length-model"));
  await drain(result.stream);
  const spans = await exported();
  assertEqual(level(ofType(spans, "generation")[0]), "WARNING");
  assertEqual(level(only(spans, "stream")), "WARNING");
});

await test("breaking out of a stream ends the root span at WARNING", async () => {
  clear();
  const result = await nl.stream(request("gpt-4o-mini"));
  for await (const chunk of result.stream) {
    void chunk;
    break;
  }
  await settle("stream");
  const root = only(await exported(), "stream");
  assertEqual(level(root), "WARNING");
  assert(
    text(root, "langfuse.observation.status_message").length > 0,
    "early close has no status message",
  );
});

await test("aborting a stream ends the root span at WARNING", async () => {
  clear();
  const controller = new AbortController();
  const result = await nl.stream(
    request("hold-model", { abortSignal: controller.signal }),
  );
  try {
    for await (const chunk of result.stream) {
      void chunk;
      controller.abort();
    }
  } catch {
    assert(controller.signal.aborted, "stream failed without an abort");
  }
  await settle("stream");
  assertEqual(level(only(await exported(), "stream")), "WARNING");
});

await test("a stream that is never iterated and then returned still ends its root span", async () => {
  clear();
  const result = await nl.stream(request("gpt-4o-mini"));
  await (result.stream as AsyncGenerator).return(undefined);
  await settle("stream");
  const roots = named(await exported(), "stream");
  assertEqual(roots.length, 1, "root span was never ended");
});

function assertGenerationCarriesToolArguments(spans: ReadableSpan[]): void {
  const recorded = ofType(spans, "generation").flatMap((generation) =>
    messages(generation, "langfuse.observation.output").flatMap(
      (message) => message.tool_calls ?? [],
    ),
  );
  assertEqual(recorded.length, 1, "expected one recorded tool call");
  assertEqual(
    recorded[0].function.arguments,
    text(only(spans, "lookup"), "langfuse.observation.input"),
    "generation output lost the tool call arguments",
  );
}

section("tools");

await test("a tool result with a data array is exported intact", async () => {
  clear();
  const payload = { data: [{ id: 1 }], total: 1 };
  const tools = {
    lookup: {
      ...lookupTool({ count: 0 }).lookup,
      execute: async () => payload,
    },
  };
  const result = await nl.stream(
    request("tool-model", { tools, disableTools: false, maxSteps: 3 }),
  );
  await drain(result.stream);
  const output = text(
    only(await exported(), "lookup"),
    "langfuse.observation.output",
  );
  assert(
    !output.includes("undefined bytes"),
    "tool output became a placeholder",
  );
  assertEqual(JSON.stringify(JSON.parse(output)), JSON.stringify(payload));
});

await test("telemetry reports enabled when the Langfuse keys are set", async () => {
  assertEqual(nl.isTelemetryEnabled(), true);
});

await test("a streamed tool call becomes a tool observation with input and output", async () => {
  clear();
  const calls = { count: 0 };
  const result = await nl.stream(
    request("tool-model", {
      tools: lookupTool(calls),
      disableTools: false,
      maxSteps: 3,
    }),
  );
  await drain(result.stream);
  assertEqual(calls.count, 1, "the tool did not run once");
  const spans = await exported();
  const tool = only(spans, "lookup");
  assertEqual(text(tool, "langfuse.observation.type"), "tool");
  assert(
    text(tool, "langfuse.observation.input").includes("needle"),
    "tool span has no input",
  );
  assert(
    text(tool, "langfuse.observation.output").includes("found"),
    "tool span has no output",
  );
  assertEqual(
    ofType(spans, "generation").length,
    2,
    "expected one generation per model request",
  );
  assertEqual(traceIds(spans).size, 1, "tool call left the trace");
  assertEqual(tool.attributes["user.id"], USER);
  assertGenerationCarriesToolArguments(spans);
});

await test("a tool observation is named after the tool", async () => {
  clear();
  await nl.generate(
    request("tool-model", {
      tools: lookupTool({ count: 0 }),
      disableTools: false,
      maxSteps: 3,
    }),
  );
  const tools = ofType(await exported(), "tool");
  assert(tools.length > 0, "no tool observation was exported");
  for (const tool of tools) {
    assertEqual(tool.name, "lookup");
  }
});

await test("a generate tool call becomes a tool observation in the same trace", async () => {
  clear();
  const calls = { count: 0 };
  await nl.generate(
    request("tool-model", {
      tools: lookupTool(calls),
      disableTools: false,
      maxSteps: 3,
    }),
  );
  assertEqual(calls.count, 1, "the tool did not run once");
  const spans = await exported();
  const tool = only(spans, "lookup");
  assertEqual(text(tool, "langfuse.observation.type"), "tool");
  assertEqual(ofType(spans, "generation").length, 2);
  assertEqual(traceIds(spans).size, 1, "tool call left the trace");
  assertGenerationCarriesToolArguments(spans);
});

await test("a per-call tool yields exactly one tool observation per execution", async () => {
  clear();
  const calls = { count: 0 };
  await nl.generate(
    request("tool-model", {
      tools: lookupTool(calls),
      disableTools: false,
      maxSteps: 3,
    }),
  );
  assertEqual(calls.count, 1, "the tool did not run once");
  assertEqual(
    ofType(await exported(), "tool").length,
    1,
    "a per-call tool was observed more than once",
  );
});

await test("a registered tool yields exactly one tool observation per execution", async () => {
  clear();
  const registered = new NeuroLink();
  const calls = { count: 0 };
  registered.registerTool("lookup", {
    name: "lookup",
    description: "look a value up",
    inputSchema: z.object({ q: z.string().optional() }),
    execute: async () => {
      calls.count++;
      return { found: true };
    },
  } as never);
  await registered.generate(
    request("tool-model", { disableTools: false, maxSteps: 3 }),
  );
  assertEqual(calls.count, 1, "the tool did not run once");
  assertEqual(
    ofType(await exported(), "tool").length,
    1,
    "a registered tool was observed more than once",
  );
});

section("providers");

async function withFakeAnthropic(run: () => Promise<void>): Promise<void> {
  const anthropic = await startAnthropic();
  const saved = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
    ANTHROPIC_AUTH_METHOD: process.env.ANTHROPIC_AUTH_METHOD,
  };
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_BASE_URL = anthropic.baseURL;
  process.env.ANTHROPIC_AUTH_METHOD = "api_key";
  try {
    await run();
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
    await anthropic.close();
  }
}

await test("a native Anthropic generation records cache usage", () =>
  withFakeAnthropic(async () => {
    clear();
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      maxTokens: 32,
      disableTools: true,
      disableInternalFallback: true,
      context,
    } as never);
    await drain(result.stream);
    const generations = ofType(await exported(), "generation");
    assertEqual(generations.length, 1, "expected a single generation");
    assertEqual(generations[0].name, "stream");
    assertEqual(
      text(generations[0], "langfuse.observation.metadata.provider"),
      "anthropic",
    );
    const usage = parsed(generations[0], "langfuse.observation.usage_details");
    assertEqual(usage.cache_read_input_tokens, 7, "cache read tokens");
    assertEqual(usage.cache_creation_input_tokens, 2, "cache write tokens");
  }));

for (const mode of ["stream", "generate"] as const) {
  await test(`a native Anthropic ${mode} tool call keeps its arguments in the generation`, () =>
    withFakeAnthropic(async () => {
      clear();
      const calls = { count: 0 };
      const options = {
        input: { text: "look it up" },
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        maxTokens: 32,
        tools: lookupTool(calls),
        disableTools: false,
        maxSteps: 3,
        disableInternalFallback: true,
        context,
      } as never;
      if (mode === "stream") {
        await drain((await nl.stream(options)).stream);
      } else {
        await nl.generate(options);
      }
      assertEqual(calls.count, 1, "the tool did not run once");
      assertGenerationCarriesToolArguments(await exported());
    }));
}

await test("decide with no provider is a WARNING generation and returns null", async () => {
  clear();
  const answer = await nl.tryDecide({
    state: "ticket text",
    questions: { urgent: { type: "boolean", instructions: "Urgent?" } },
  } as never);
  assertEqual(answer, null, "tryDecide should fail open");
  const decisions = ofType(await exported(), "generation").filter(
    (span) => span.name === "decide",
  );
  assertEqual(decisions.length, 1, "expected one decide generation");
  assertEqual(level(decisions[0]), "WARNING");
});

await test("tryDecide puts its per-call context on the decision spans", async () => {
  clear();
  await nl.tryDecide({
    state: "ticket text",
    questions: { urgent: { type: "boolean", instructions: "Urgent?" } },
    context: {
      userId: "decide-user",
      sessionId: "decide-session",
      tags: ["decide-tag"],
    },
  } as never);
  const decisions = ofType(await everySpan(), "generation").filter(
    (span) => span.name === "decide",
  );
  assertEqual(decisions.length, 1, "expected one decide generation");
  assertEqual(decisions[0].attributes["user.id"], "decide-user");
  assertEqual(decisions[0].attributes["session.id"], "decide-session");
  assertEqual(
    String(decisions[0].attributes["langfuse.trace.tags"]),
    "decide-tag",
  );
});

await test("decide against a configured provider is a generation with output", async () => {
  const laya = await startLaya();
  process.env.LAYA_API_KEY = "laya-test";
  process.env.LAYA_BASE_URL = laya.baseURL;
  try {
    clear();
    const result = await nl.decide({
      state: "ticket text",
      questions: { urgent: { type: "boolean", instructions: "Urgent?" } },
      context,
    } as never);
    assertEqual(laya.requests.length, 1, "decision endpoint was not called");
    assert(result.answers.urgent !== undefined, "no answer was returned");
    const decisions = ofType(await exported(), "generation").filter(
      (span) => span.name === "decide",
    );
    assertEqual(decisions.length, 1, "expected one decide generation");
    assertEqual(
      text(decisions[0], "langfuse.observation.model.name"),
      result.model,
    );
    assertEqual(
      text(decisions[0], "langfuse.observation.metadata.provider"),
      "laya",
    );
    assert(level(decisions[0]) === undefined, "a good decision was flagged");
    assert(
      text(decisions[0], "langfuse.observation.output").length > 0,
      "decision has no output",
    );
  } finally {
    delete process.env.LAYA_API_KEY;
    delete process.env.LAYA_BASE_URL;
    await laya.close();
  }
});

section("naming");

function traceNameOf(span: ReadableSpan): Json | undefined {
  return span.attributes["langfuse.trace.name"];
}

await test("a trace takes the caller's traceName", async () => {
  clear();
  await nl.generate(
    request("gpt-4o-mini", { context: { ...context, traceName: "checkout" } }),
  );
  const generateRoot = only(await exported(), "generate");
  assertEqual(traceNameOf(generateRoot), "checkout");
  clear();
  const result = await nl.stream(
    request("gpt-4o-mini", { context: { ...context, traceName: "chat" } }),
  );
  await drain(result.stream);
  assertEqual(traceNameOf(only(await exported(), "stream")), "chat");
});

await test("without a traceName the trace is named after the operation", async () => {
  clear();
  await nl.generate(request("gpt-4o-mini"));
  const generateRoot = only(await exported(), "generate");
  assertEqual(generateRoot.parentSpanContext, undefined, "root has a parent");
  assert(
    traceNameOf(generateRoot) === undefined,
    "an unrequested trace name was invented",
  );
  clear();
  const result = await nl.stream(request("gpt-4o-mini"));
  await drain(result.stream);
  const streamRoot = only(await exported(), "stream");
  assertEqual(streamRoot.parentSpanContext, undefined, "root has a parent");
});

await test("every model request is named after the API call", async () => {
  clear();
  await nl.generate(request("gpt-4o-mini"));
  const generations = ofType(await exported(), "generation");
  assert(generations.length > 0, "no generation was exported");
  for (const generation of generations) {
    assertEqual(generation.name, "generate");
    assert(
      text(generation, "langfuse.observation.model.name") !== "",
      "the model is missing from the generation",
    );
  }
  clear();
  const result = await nl.stream(request("gpt-4o-mini"));
  await drain(result.stream);
  for (const generation of ofType(await exported(), "generation")) {
    assertEqual(generation.name, "stream");
  }
});

await test("the root observation and the trace carry the output", async () => {
  clear();
  await nl.generate(request("gpt-4o-mini"));
  const generateRoot = only(await exported(), "generate");
  assertEqual(
    assistantText(generateRoot, "langfuse.trace.output"),
    "hello there",
  );
  clear();
  const result = await nl.stream(request("gpt-4o-mini"));
  await drain(result.stream);
  const streamRoot = only(await exported(), "stream");
  assertEqual(
    assistantText(streamRoot, "langfuse.observation.output"),
    "hello",
  );
  assertEqual(assistantText(streamRoot, "langfuse.trace.output"), "hello");
});

await test("a failed run still gives the root an output", async () => {
  clear();
  await nl.generate(request("reject-model")).then(
    () => undefined,
    () => undefined,
  );
  const generateRoot = only(await exported(), "generate");
  assert(
    text(generateRoot, "langfuse.observation.output").length > 0,
    "failed root has no output",
  );
});

await test("generations and the root read as a conversation", async () => {
  clear();
  await nl.generate(request("gpt-4o-mini", { systemPrompt: "be brief" }));
  const spans = await exported();
  const generation = ofType(spans, "generation")[0];
  const sent = messages(generation, "langfuse.observation.input");
  assertEqual(sent[0].role, "system");
  assertEqual(sent[0].content, "be brief");
  assert(
    sent.some((entry) => entry.role === "user"),
    "the generation input has no user message",
  );
  assertEqual(
    assistantText(generation, "langfuse.observation.output"),
    "hello there",
  );
  const rootInput = messages(
    only(spans, "generate"),
    "langfuse.observation.input",
  );
  assert(
    rootInput.every((entry) => entry.role === "user"),
    "the root input holds more than the user messages",
  );
});

await test("tool steps are grouped under step spans", async () => {
  clear();
  await nl.generate(
    request("tool-model", {
      tools: lookupTool({ count: 0 }),
      disableTools: false,
      maxSteps: 3,
    }),
  );
  const spans = await exported();
  const steps = named(spans, "step");
  assertEqual(steps.length, 2, "expected two step spans");
  assertEqual(
    steps
      .map((step) => text(step, "langfuse.observation.metadata.step_index"))
      .sort()
      .join(","),
    "1,2",
  );
  for (const step of steps) {
    assertEqual(text(step, "langfuse.observation.type"), "span");
    assert(
      step.attributes["langfuse.observation.model.name"] === undefined &&
        step.attributes["langfuse.observation.usage_details"] === undefined,
      "a step span carries model or usage",
    );
  }
  const stepIds = new Set(steps.map((step) => step.spanContext().spanId));
  const parentOf = (span: ReadableSpan): string | undefined =>
    span.parentSpanContext?.spanId;
  const generations = ofType(spans, "generation");
  assertEqual(generations.length, 2);
  for (const generation of generations) {
    assert(
      stepIds.has(parentOf(generation) ?? ""),
      "a generation is not parented by a step",
    );
  }
  const tool = only(spans, "lookup");
  assert(stepIds.has(parentOf(tool) ?? ""), "the tool is not under a step");
  const first = generations.find((entry) =>
    messages(entry, "langfuse.observation.output").some(
      (message) => message.tool_calls?.[0]?.function.name === "lookup",
    ),
  );
  assert(first !== undefined, "the tool call is not in the assistant message");
});

const INFRASTRUCTURE_SPANS = [
  "tools.register",
  "tools.getAll",
  "message.build_for_stream",
  "generateTextInternal",
  "provider.generate",
  "provider.stream",
  "executeGeneration",
];

function isLinked(span: ReadableSpan): boolean {
  return (
    span.name === "step" ||
    ["generation", "tool"].includes(text(span, "langfuse.observation.type"))
  );
}

function assertCleanExport(spans: ReadableSpan[]): void {
  const names = spans.map((span) => span.name);
  for (const name of INFRASTRUCTURE_SPANS) {
    assert(!names.includes(name), `${name} was exported`);
  }
  const untyped = spans.filter(
    (span) => span.attributes["langfuse.observation.type"] === undefined,
  );
  assertEqual(
    untyped.length,
    0,
    `exported without an observation type: ${untyped.map((span) => span.name).join(", ")}`,
  );
  const ids = new Set(spans.map((span) => span.spanContext().spanId));
  for (const span of spans.filter(isLinked)) {
    const parent = span.parentSpanContext?.spanId;
    assert(
      parent !== undefined && ids.has(parent),
      `${span.name} is not parented by an exported span`,
    );
  }
}

await test("a generate exports observations only", async () => {
  clear();
  await nl.generate(
    request("tool-model", {
      tools: lookupTool({ count: 0 }),
      disableTools: false,
      maxSteps: 3,
    }),
  );
  assertCleanExport(await exported());
});

await test("a stream with a tool exports observations only", async () => {
  clear();
  const result = await nl.stream(
    request("tool-model", {
      tools: lookupTool({ count: 0 }),
      disableTools: false,
      maxSteps: 3,
    }),
  );
  await drain(result.stream);
  assertCleanExport(await exported());
});

const PRODUCT = /neurolink/i;

function productHits(span: ReadableSpan): string[] {
  const hits: string[] = [];
  const check = (where: string, value: Json): void => {
    if (PRODUCT.test(typeof value === "string" ? value : "")) {
      hits.push(`${span.name}: ${where}`);
    }
  };
  check("name", span.name);
  check("scope", span.instrumentationScope.name);
  for (const [key, value] of Object.entries(span.resource.attributes)) {
    check(`resource ${key}`, key);
    check(`resource ${key}`, value);
  }
  for (const [key, value] of Object.entries(span.attributes)) {
    check(`attribute key ${key}`, key);
    check(`attribute ${key}`, value);
  }
  for (const event of span.events) {
    check(`event ${event.name}`, event.name);
    for (const [key, value] of Object.entries(event.attributes ?? {})) {
      check(`event ${event.name} ${key}`, `${key}${String(value)}`);
    }
  }
  return hits;
}

await test("only model calls carry an attribute Langfuse reads as a model", async () => {
  await exported();
  const stray = [...seen].filter(
    (span) =>
      "model" in span.attributes ||
      ("llm.model_name" in span.attributes &&
        span.attributes["langfuse.observation.type"] !== "generation"),
  );
  assertEqual(
    stray.length,
    0,
    `model attribute on ${stray.map((span) => span.name).join(", ")}`,
  );
});

await test("no exported span names the product anywhere", async () => {
  await everySpan();
  await exported();
  assert(seen.size > 20, "too few spans were collected to scan");
  const hits = [...seen].flatMap(productHits);
  assertEqual(
    hits.length,
    0,
    `product name found at ${hits.slice(0, 5).join(" | ")}`,
  );
});

section("export boundaries");

await test("a provider health check exports no spans", async () => {
  clear();
  await nl.testProvider("openai");
  assert((await everySpan()).length > 0, "no span was recorded at all");
  const spans = await exported();
  assertEqual(spans.length, 0, "a health check leaked into the export");
});

await test("a direct provider generate exports a generate generation", async () => {
  clear();
  const provider = await AIProviderFactory.createProvider(
    "openai",
    "gpt-4o-mini",
    false,
    undefined,
    undefined,
    credentials as never,
  );
  await provider.generate({
    input: { text: "hi" },
    disableTools: true,
  } as never);
  const generations = ofType(await exported(), "generation");
  assert(
    generations.some((span) => span.name === "generate"),
    "no generate generation was exported",
  );
});

await test("the host provider is detected and only a Langfuse exporter is registered", async () => {
  const status = getLangfuseHealthStatus();
  assert(status.usingExternalProvider, "host provider was not detected");
  assert(status.hasProcessor, "the Langfuse exporter was not registered");
  assert(status.isHealthy, "health ignored the registered exporter");
});

const nullIdentity: NonNullable<GenerateOptions["context"]> = {
  userId: null,
  sessionId: null,
  conversationId: null,
  requestId: null,
  traceName: null,
};

await test("a context with null identity fields is accepted and traced", async () => {
  clear();
  await nl.generate(
    request("gpt-4o-mini", { context: nullIdentity as RequestExtra }),
  );
  const root = only(await exported(), "generate");
  assertEqual(root.attributes["user.id"], undefined);
  assertEqual(root.attributes["session.id"], undefined);
});

await test("shutting down another instance keeps this one exporting", async () => {
  const sibling = new NeuroLink();
  await sibling.shutdown();
  clear();
  await nl.generate(request("gpt-4o-mini"));
  assertEqual(named(await exported(), "generate").length, 1);
});

section("owned provider");

const CHILD = join(tempDir("neurolink-obs-child-"), "child.mjs");
writeFileSync(
  CHILD,
  `
import { AIProviderFactory, NeuroLink, flushOpenTelemetry, getLangfuseHealthStatus, shutdownOpenTelemetry } from ${JSON.stringify(
    pathToFileURL(join(process.cwd(), "dist/index.js")).href,
  )};
if (process.env.OBS_DIRECT_URL) {
  const provider = await AIProviderFactory.createProvider("openai", "gpt-4o-mini", false, undefined, undefined, { openai: { apiKey: "k", baseURL: process.env.OBS_DIRECT_URL } });
  await provider.generate({ input: { text: "hi" }, disableTools: true });
} else {
  const config = process.env.OBS_CONFIG ? JSON.parse(process.env.OBS_CONFIG) : undefined;
  const nl = new NeuroLink(config ? { observability: config } : undefined);
  await nl.tryDecide({ state: "x", questions: { q: { type: "boolean", instructions: "?" } } });
}
await flushOpenTelemetry().catch(() => undefined);
const status = getLangfuseHealthStatus();
await shutdownOpenTelemetry();
console.log("STATUS " + JSON.stringify(status));
process.exit(0);
`,
);

function parseStatus<T>(stdout: string): T {
  const line = stdout.split("\n").find((l) => l.startsWith("STATUS "));
  assert(line !== undefined, "process printed no status");
  return JSON.parse((line as string).slice("STATUS ".length));
}

async function runChild(
  env: Record<string, string>,
): Promise<{ hasProcessor: boolean; usingExternalProvider: boolean }> {
  const result = await runCommand(process.execPath, [CHILD], {
    cwd: process.cwd(),
    timeoutMs: 45_000,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      DOTENV_CONFIG_PATH: "/dev/null",
      NEUROLINK_SKIP_MCP: "true",
      ...env,
    },
  });
  assertEqual(result.exitCode, 0, "child process failed");
  return parseStatus(result.stdout);
}

await test("without keys NeuroLink creates no Langfuse processor", async () => {
  const status = await runChild({});
  assert(!status.hasProcessor, "a processor was created without keys");
});

await test("LANGFUSE keys in the environment enable the processor and export to Langfuse", async () => {
  const langfuse = await startLangfuse();
  try {
    const status = await runChild({
      LANGFUSE_PUBLIC_KEY: "pk-child",
      LANGFUSE_SECRET_KEY: "sk-child",
      LANGFUSE_BASE_URL: langfuse.baseUrl,
    });
    assert(status.hasProcessor, "keys did not enable the processor");
    assert(
      !status.usingExternalProvider,
      "NeuroLink should own the provider here",
    );
    const hit = langfuse.hits.find((entry) =>
      entry.path.includes("/api/public/otel/v1/traces"),
    );
    assert(hit !== undefined, "Langfuse received no trace export");
    assertEqual(
      hit?.authorization,
      `Basic ${Buffer.from("pk-child:sk-child").toString("base64")}`,
      "export used other credentials",
    );
  } finally {
    await langfuse.close();
  }
});

await test("a direct provider call with no NeuroLink instance starts telemetry and exports", async () => {
  const langfuse = await startLangfuse();
  try {
    const status = await runChild({
      LANGFUSE_PUBLIC_KEY: "pk-child",
      LANGFUSE_SECRET_KEY: "sk-child",
      LANGFUSE_BASE_URL: langfuse.baseUrl,
      OBS_DIRECT_URL: fake.baseURL,
    });
    assert(
      status.hasProcessor,
      "a direct provider call did not start telemetry",
    );
    assert(
      langfuse.hits.some((entry) =>
        entry.path.includes("/api/public/otel/v1/traces"),
      ),
      "Langfuse received no trace export from the direct call",
    );
  } finally {
    await langfuse.close();
  }
});

await test("observability langfuse false disables the processor despite keys", async () => {
  const status = await runChild({
    LANGFUSE_PUBLIC_KEY: "pk-child",
    LANGFUSE_SECRET_KEY: "sk-child",
    OBS_CONFIG: JSON.stringify({ langfuse: false }),
  });
  assert(!status.hasProcessor, "langfuse false still created a processor");
});

await test("an observability langfuse object enables the processor without env keys", async () => {
  const status = await runChild({
    OBS_CONFIG: JSON.stringify({
      langfuse: {
        publicKey: "pk-config",
        secretKey: "sk-config",
        baseUrl: "http://127.0.0.1:9",
      },
    }),
  });
  assert(status.hasProcessor, "the config object did not enable the processor");
});

section("trace delivery");

const SCENARIO = join(tempDir("neurolink-obs-scenario-"), "scenario.mjs");
writeFileSync(
  SCENARIO,
  `
import { NeuroLink, AIProviderFactory, flushOpenTelemetry, jsonSchema, setLangfuseContext, shutdownOpenTelemetry } from ${JSON.stringify(
    pathToFileURL(join(process.cwd(), "dist/index.js")).href,
  )};
const env = process.env;
const scenario = env.OBS_SCENARIO;
const credentials = { openai: { apiKey: "k", baseURL: env.OBS_OPENAI_URL } };
const context = { userId: "u-int", sessionId: "s-int", tags: ["t1"], metadata: { feature: "obs" } };
const call = (model, extra = {}) => ({ input: { text: "hi" }, provider: "openai", model, credentials, disableTools: true, disableInternalFallback: true, context, ...extra });
const drain = async (stream) => { for await (const chunk of stream) void chunk; };
const mask = scenario === "mask" ? () => "masked-text" : undefined;
const nl = new NeuroLink({ observability: { langfuse: { baseUrl: env.OBS_INGEST_URL, publicKey: "pk-i", secretKey: "sk-i", mask } } });
const lookup = { lookup: { description: "look a value up", inputSchema: jsonSchema({ type: "object", properties: { q: { type: "string" } }, additionalProperties: true }), execute: async () => ({ found: true }) } };
if (scenario === "outer") {
  await setLangfuseContext({ userId: "email", traceName: "name" }, () => nl.generate(call("gpt-4o-mini", { context: { ...context, userId: "composite" } })));
} else if (scenario === "nested") {
  const nesting = { lookup: { ...lookup.lookup, execute: async () => { await nl.generate(call("gpt-4o-mini", { input: { text: "inner question" } })); return { found: true }; } } };
  const turn = await nl.stream(call("tool-model", { disableTools: false, maxSteps: 3, tools: nesting }));
  await drain(turn.stream);
} else if (scenario === "meta") {
  const url = "https://example.com/" + "a".repeat(310);
  const nesting = { lookup: { ...lookup.lookup, execute: async () => { await nl.generate(call("gpt-4o-mini", { input: { text: "inner question" } })); return { found: true }; } } };
  await setLangfuseContext({ metadata: { applicationLogs: url, platformIntegrations: ["a", "b"], short: "x", winner: "outer" } }, async () => {
    const turn = await nl.stream(call("tool-model", { disableTools: false, maxSteps: 3, tools: nesting, context: { ...context, metadata: { winner: "inner", perCall: url } } }));
    await drain(turn.stream);
  });
} else if (scenario === "named") {
  await nl.generate(call("gpt-4o-mini", { context: { ...context, traceName: "trace-x", observationName: "orchestrator-llm-generation" } }));
  await nl.generate(call("gpt-4o-mini"));
} else if (scenario === "full") {
  await nl.generate(call("gpt-4o-mini", { context: { ...context, traceName: "custom-name" } }));
  const withTool = await nl.stream(call("tool-model", { disableTools: false, maxSteps: 3, tools: lookup }));
  await drain(withTool.stream);
  const early = await nl.stream(call("gpt-4o-mini"));
  for await (const chunk of early.stream) { void chunk; break; }
  await new Promise((resolve) => setTimeout(resolve, 300));
  await nl.generate(call("reject-model")).catch(() => undefined);
  await nl.tryDecide({ state: "x", questions: { q: { type: "boolean", instructions: "?" } }, context });
  const provider = await AIProviderFactory.createProvider("openai", "gpt-4o-mini", false, undefined, undefined, credentials);
  await provider.generate({ input: { text: "hi" }, disableTools: true });
} else if (scenario === "many") {
  for (let i = 0; i < 20; i++) await nl.generate(call("gpt-4o-mini"));
} else if (scenario === "unauthorized") {
  await nl.generate(call("gpt-4o-mini"));
  await flushOpenTelemetry();
  await nl.generate(call("gpt-4o-mini"));
} else {
  await nl.generate(call("gpt-4o-mini"));
}
if (scenario !== "shutdown") await flushOpenTelemetry();
await shutdownOpenTelemetry();
process.exit(0);
`,
);

async function runScenario(
  scenario: string,
  mode: OtlpMode = "ok",
): Promise<{
  hits: OtlpHit[];
  spans: DecodedSpan[];
  sends: Map<string, number>;
  output: string;
}> {
  const receiver = await startLangfuse(mode);
  try {
    const result = await runCommand(process.execPath, [SCENARIO], {
      cwd: process.cwd(),
      timeoutMs: 50_000,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        DOTENV_CONFIG_PATH: "/dev/null",
        NEUROLINK_SKIP_MCP: "true",
        NEUROLINK_DEBUG: "true",
        NEUROLINK_LOG_LEVEL: "warn",
        LANGFUSE_TRACING_ENVIRONMENT: "test-env",
        LANGFUSE_RELEASE: "test-release",
        OBS_SCENARIO: scenario,
        OBS_INGEST_URL: receiver.baseUrl,
        OBS_OPENAI_URL: fake.baseURL,
      },
    });
    assertEqual(result.exitCode, 0, `scenario ${scenario} failed`);
    return {
      hits: receiver.hits,
      spans: receiver.hits.flatMap((entry) => entry.spans),
      sends: receiver.sends,
      output: `${result.stdout}\n${result.stderr}`,
    };
  } finally {
    await receiver.close();
  }
}

function kind(span: DecodedSpan): Json | undefined {
  return span.attributes["langfuse.observation.type"];
}

function byName(spans: DecodedSpan[], name: string): DecodedSpan[] {
  return spans.filter((span) => span.name === name);
}

function rootOf(spans: DecodedSpan[], name: string): DecodedSpan {
  const root = byName(spans, name).find((span) => kind(span) === "agent");
  assert(root !== undefined, `no ${name} agent root`);
  return root as DecodedSpan;
}

const full = await runScenario("full");

await test("observations keep their native Langfuse types", async () => {
  const types = new Set(full.spans.map(kind));
  for (const expected of ["agent", "generation", "tool", "span"]) {
    assert(types.has(expected), `no ${expected} observation was exported`);
  }
  assertEqual(kind(byName(full.spans, "lookup")[0]), "tool");
});

await test("a string returned by mask is exported without extra quoting", async () => {
  const masked = await runScenario("mask");
  const root = rootOf(masked.spans, "generate");
  assertEqual(root.attributes["langfuse.observation.input"], "masked-text");
  assertEqual(root.attributes["langfuse.observation.output"], "masked-text");
});

await test("every observation carries user, session, tags and metadata", async () => {
  const traced = full.spans.filter(
    (span) => span.attributes["user.id"] === "u-int",
  );
  assert(traced.length > 0, "no span carries the user");
  for (const span of traced) {
    assertEqual(span.attributes["session.id"], "s-int", `${span.name} session`);
    assertEqual(String(span.attributes["langfuse.trace.tags"]), "t1");
    assertEqual(
      span.attributes["langfuse.trace.metadata.feature"],
      "obs",
      `${span.name} metadata`,
    );
  }
  const untraced = full.spans.filter(
    (span) => span.attributes["user.id"] === undefined,
  );
  assert(untraced.length > 0, "the direct call lost its own trace");
  assert(
    traced.length > untraced.length,
    "identity did not reach the observations below the root",
  );
});

await test("the root carries the configured trace name, input and output", async () => {
  const generate = rootOf(full.spans, "generate");
  assertEqual(generate.attributes["langfuse.trace.name"], "custom-name");
  assert(
    String(generate.attributes["langfuse.trace.input"]).includes("hi"),
    "trace input",
  );
  assert(
    generate.attributes["langfuse.trace.output"] !== undefined,
    "trace output",
  );
});

await test("an outer setLangfuseContext wins over the per-call context for user and trace name", async () => {
  const outer = await runScenario("outer");
  const traced = outer.spans.filter(
    (span) => span.attributes["user.id"] !== undefined,
  );
  assert(traced.length > 0, "no span carries the user");
  for (const span of traced) {
    assertEqual(span.attributes["user.id"], "email", `${span.name} user`);
    assertEqual(
      span.attributes["langfuse.trace.name"],
      "name",
      `${span.name} trace name`,
    );
    assertEqual(span.attributes["session.id"], "s-int", `${span.name} session`);
  }
});

await test("a generate nested in a turn does not overwrite the trace input and output", async () => {
  const nested = await runScenario("nested");
  assert(
    byName(nested.spans, "generate").length > 0,
    "the nested generate did not run",
  );
  const inputs = nested.spans
    .map((span) => span.attributes["langfuse.trace.input"])
    .filter((value) => value !== undefined)
    .map(String);
  const outputs = nested.spans
    .map((span) => span.attributes["langfuse.trace.output"])
    .filter((value) => value !== undefined)
    .map(String);
  assert(inputs.length > 0 && outputs.length > 0, "the root wrote no trace io");
  assert(
    inputs.every((value) => !value.includes("inner question")),
    "the nested turn wrote the trace input",
  );
  assert(
    outputs.every((value) => !value.includes("hello there")),
    "the nested turn wrote the trace output",
  );
});

await test("environment and release reach every span", async () => {
  for (const span of full.spans) {
    assertEqual(
      span.attributes["langfuse.environment"],
      "test-env",
      `${span.name} environment`,
    );
    assertEqual(
      span.attributes["langfuse.release"],
      "test-release",
      `${span.name} release`,
    );
  }
});

await test("observations form root, attempt, step and generation", async () => {
  const root = rootOf(full.spans, "generate");
  const attempt = byName(full.spans, "generate.attempt").find(
    (span) => span.parentSpanId === root.spanId,
  ) as DecodedSpan;
  assert(attempt !== undefined, "no attempt under the root");
  const step = byName(full.spans, "step").find(
    (span) => span.parentSpanId === attempt.spanId,
  ) as DecodedSpan;
  assert(step !== undefined, "no step under the attempt");
  const generation = byName(full.spans, "generate").find(
    (span) => kind(span) === "generation" && span.parentSpanId === step.spanId,
  ) as DecodedSpan;
  assert(generation !== undefined, "no generation under the step");
  assertEqual(
    generation.attributes["langfuse.observation.model.name"],
    "gpt-4o-mini",
  );
  assert(
    generation.attributes["langfuse.observation.model.parameters"] !==
      undefined,
    "modelParameters",
  );
  assert(
    JSON.parse(
      String(generation.attributes["langfuse.observation.usage_details"]),
    ).input > 0,
    "usage input",
  );
  assert(
    generation.attributes["langfuse.observation.cost_details"] !== undefined,
    "cost details",
  );
  assert(
    String(generation.attributes["langfuse.observation.input"]).includes(
      '"role":"user"',
    ),
    "chat input",
  );
});

await test("a streamed tool call carries arguments and a tool observation named by the tool", async () => {
  const tool = byName(full.spans, "lookup")[0];
  assert(tool !== undefined, "no tool observation");
  assert(
    tool.attributes["langfuse.observation.input"] !== undefined,
    "tool input",
  );
  assert(
    tool.attributes["langfuse.observation.output"] !== undefined,
    "tool output",
  );
  const generations = full.spans.filter(
    (span) => kind(span) === "generation" && span.traceId === tool.traceId,
  );
  assert(
    generations.some((span) =>
      String(span.attributes["langfuse.observation.output"]).includes(
        "tool_calls",
      ),
    ),
    "no generation recorded the tool call",
  );
  assert(
    generations.some(
      (span) =>
        span.attributes["langfuse.observation.completion_start_time"] !==
        undefined,
    ),
    "completionStartTime",
  );
});

await test("an early-closed stream is a WARNING with a status message", async () => {
  const warned = byName(full.spans, "stream").filter(
    (span) =>
      span.attributes["langfuse.observation.level"] === "WARNING" &&
      kind(span) === "agent",
  );
  assert(warned.length > 0, "no WARNING root");
  assert(
    String(warned[0].attributes["langfuse.observation.status_message"]).length >
      0,
    "no status message",
  );
});

await test("a failed model call is an ERROR generation", async () => {
  const failed = full.spans.filter(
    (span) =>
      kind(span) === "generation" &&
      span.attributes["langfuse.observation.model.name"] === "reject-model",
  );
  assert(failed.length > 0, "no generation for the rejected model");
  assertEqual(failed[0].attributes["langfuse.observation.level"], "ERROR");
  assertEqual(failed[0].statusCode, 2, "OTLP status code");
});

await test("decide with no provider is a WARNING generation", async () => {
  const decision = byName(full.spans, "decide")[0];
  assert(decision !== undefined, "no decide observation");
  assertEqual(kind(decision), "generation");
  assertEqual(decision.attributes["langfuse.observation.level"], "WARNING");
});

await test("a direct provider call is exported without trace context", async () => {
  const bare = full.spans.filter(
    (span) =>
      span.parentSpanId === undefined &&
      span.attributes["user.id"] === undefined,
  );
  assert(bare.length > 0, "the direct call produced no root");
});

await test("nothing the exporter sends names the product", async () => {
  assert(
    !/neurolink/i.test(JSON.stringify(full.spans)),
    "the product name reached Langfuse",
  );
  for (const hit of full.hits) {
    assert(
      !/neurolink/i.test(JSON.stringify(hit.headers)),
      "the product name is in a request header",
    );
  }
});

await test("requests are authenticated with the configured keys and posted as JSON", async () => {
  for (const hit of full.hits) {
    assertEqual(
      hit.authorization,
      `Basic ${Buffer.from("pk-i:sk-i").toString("base64")}`,
    );
    assertEqual(hit.headers["content-type"], "application/json");
    assertEqual(hit.path, "/api/public/otel/v1/traces");
  }
});

await test("many spans are batched into fewer requests", async () => {
  const many = await runScenario("many");
  assert(many.spans.length > 60, "too few spans to test batching");
  assert(many.hits.length * 3 < many.spans.length, "spans were not batched");
  for (const hit of many.hits) {
    assert(hit.spans.length <= 500, "a request exceeded the span cap");
  }
});

await test("a rejected span is reported once and never re-sent", async () => {
  const partial = await runScenario("partial", "partial");
  assert(partial.spans.length > 0, "no span was sent");
  for (const count of partial.sends.values()) {
    assertEqual(count, 1, "a rejected span was retried");
  }
  assert(partial.output.includes("spans rejected"), "no rejection warning");
});

await test("a 500 is retried and the batch is delivered", async () => {
  const flaky = await runScenario("single", "flaky");
  assertEqual(flaky.hits[0].status, 500);
  assert(flaky.hits.length >= 2, "the failed request was not retried");
  assertEqual(flaky.hits[flaky.hits.length - 1].status, 200);
  assert(byName(flaky.spans, "generate").length > 0, "nothing was delivered");
});

await test("a 401 is not retried and is logged once", async () => {
  const rejected = await runScenario("unauthorized", "unauthorized");
  assertEqual(rejected.hits.length, 2, "401 batches were retried");
  const warnings =
    rejected.output.split("Langfuse credentials rejected").length - 1;
  assertEqual(warnings, 1, "credentials warning count");
});

await test("shutdown delivers everything still queued", async () => {
  const shutdown = await runScenario("shutdown");
  assert(
    byName(shutdown.spans, "generate").length > 0,
    "queued spans were lost on shutdown",
  );
});

section("trace metadata and root naming");

const meta = await runScenario("meta");
const metaUrl = `https://example.com/${"a".repeat(310)}`;
const metaKey = "langfuse.trace.metadata.";

await test("long and array trace metadata reach the trace in full, written once", async () => {
  assertEqual(metaUrl.length, 330);
  const roots = meta.spans.filter(
    (span) => span.attributes[`${metaKey}applicationLogs`] !== undefined,
  );
  assertEqual(roots.length, 1, "metadata was not written exactly once");
  const root = roots[0] as DecodedSpan;
  assertEqual(root.name, "stream");
  assertEqual(root.attributes[`${metaKey}applicationLogs`], metaUrl);
  assertEqual(
    String(root.attributes[`${metaKey}platformIntegrations`]),
    JSON.stringify(["a", "b"]),
  );
  assertEqual(root.attributes[`${metaKey}perCall`], metaUrl);
});

await test("short metadata stays on child observations and inner keys win", async () => {
  const children = meta.spans.filter((span) => span.name === "stream.attempt");
  assert(children.length > 0, "no attempt span exported");
  for (const span of children) {
    assertEqual(span.attributes[`${metaKey}short`], "x", `${span.name} short`);
    assertEqual(span.attributes[`${metaKey}winner`], "inner");
    assertEqual(span.attributes[`${metaKey}feature`], undefined);
  }
  assertEqual(
    meta.spans.filter(
      (span) => span.attributes[`${metaKey}applicationLogs`] !== undefined,
    ).length,
    1,
    "a child observation carried the long value",
  );
});

const renamed = await runScenario("named");

await test("observationName renames the root agent observation only", async () => {
  const root = rootOf(renamed.spans, "orchestrator-llm-generation");
  assertEqual(root.attributes["langfuse.trace.name"], "trace-x");
  const attempt = byName(renamed.spans, "generate.attempt").find(
    (span) => span.parentSpanId === root.spanId,
  );
  assert(attempt !== undefined, "attempt is not parented by the renamed root");
  assertEqual(
    byName(renamed.spans, "orchestrator-llm-generation").length,
    1,
    "the name reached a child",
  );
  assertEqual(
    renamed.spans.filter(
      (span) => span.name === "generate" && kind(span) === "agent",
    ).length,
    1,
    "the default root is not named generate",
  );
});

section("host provider");

const HOST = join(tempDir("neurolink-obs-host-"), "host.mjs");
writeFileSync(
  HOST,
  `
import { NeuroLink, createExporterSpanProcessor, flushOpenTelemetry, getLangfuseHealthStatus, setLangfuseContext, shutdownOpenTelemetry } from ${JSON.stringify(
    pathToFileURL(join(process.cwd(), "dist/index.js")).href,
  )};
import { NodeTracerProvider } from ${JSON.stringify(
    import.meta.resolve("@opentelemetry/sdk-trace-node"),
  )};
import { ROOT_CONTEXT, TraceFlags, context, trace } from ${JSON.stringify(
    import.meta.resolve("@opentelemetry/api"),
  )};
const env = process.env;
const host = new NodeTracerProvider({ spanProcessors: env.HOST_PROCESSOR === "1" ? [createExporterSpanProcessor()] : [] });
host.register();
const langfuse = env.HOST_KEYS === "1" ? { publicKey: "pk-host", secretKey: "sk-host", baseUrl: env.OBS_INGEST_URL } : undefined;
const make = () => new NeuroLink(langfuse ? { observability: { langfuse } } : undefined);
const credentials = { openai: { apiKey: "k", baseURL: env.OBS_OPENAI_URL } };
const call = { input: { text: "hi" }, provider: "openai", model: "gpt-4o-mini", credentials, disableTools: true, disableInternalFallback: true };
const first = make();
const second = make();
await setLangfuseContext({ userId: "u-host", sessionId: "s-host", traceName: "host-trace", tags: ["agent", "agent:a1"] }, () => first.generate(call));
await second.generate(call);
if (env.HOST_REMOTE === "1") {
  const remote = trace.setSpanContext(ROOT_CONTEXT, { traceId: "0af7651916cd43dd8448eb211c80319c", spanId: "b7ad6b7169203331", traceFlags: TraceFlags.SAMPLED, isRemote: true });
  await context.with(remote, () => first.generate(call));
}
await flushOpenTelemetry();
await host.forceFlush();
const status = getLangfuseHealthStatus();
await shutdownOpenTelemetry();
await host.shutdown();
console.log("STATUS " + JSON.stringify(status));
process.exit(0);
`,
);

async function runHost(env: Record<string, string>): Promise<{
  status: { isHealthy: boolean; hasProcessor: boolean };
  spans: DecodedSpan[];
  sends: Map<string, number>;
}> {
  const receiver = await startLangfuse();
  try {
    const result = await runCommand(process.execPath, [HOST], {
      cwd: process.cwd(),
      timeoutMs: 50_000,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        DOTENV_CONFIG_PATH: "/dev/null",
        NEUROLINK_SKIP_MCP: "true",
        OBS_INGEST_URL: receiver.baseUrl,
        LANGFUSE_BASE_URL: receiver.baseUrl,
        OBS_OPENAI_URL: fake.baseURL,
        ...env,
      },
    });
    assertEqual(result.exitCode, 0, "host scenario failed");
    return {
      status: parseStatus(result.stdout),
      spans: receiver.hits.flatMap((entry) => entry.spans),
      sends: receiver.sends,
    };
  } finally {
    await receiver.close();
  }
}

await test("a host provider with the exporter processor exports configured Langfuse keys, identity and tags", async () => {
  const run = await runHost({ HOST_PROCESSOR: "1", HOST_KEYS: "1" });
  assert(run.status.isHealthy, "host mode with an exporter was not healthy");
  assert(run.status.hasProcessor, "no exporter was registered");
  const traced = run.spans.filter(
    (span) => span.attributes["user.id"] === "u-host",
  );
  assert(traced.length > 0, "no span reached Langfuse with the user");
  for (const span of traced) {
    assertEqual(
      span.attributes["session.id"],
      "s-host",
      `${span.name} session`,
    );
    assertEqual(
      span.attributes["langfuse.trace.name"],
      "host-trace",
      `${span.name} trace name`,
    );
    assertEqual(
      String(span.attributes["langfuse.trace.tags"]),
      "agent,agent:a1",
      `${span.name} tags`,
    );
  }
  assertEqual(
    run.spans.filter(
      (span) =>
        span.name === "generate" &&
        span.attributes["langfuse.observation.type"] === "agent",
    ).length,
    2,
    "two instances should export two generate roots",
  );
});

await test("a root under an unknown remote parent exports as a top-level observation", async () => {
  const run = await runHost({
    HOST_PROCESSOR: "1",
    HOST_KEYS: "1",
    HOST_REMOTE: "1",
  });
  const remote = run.spans.filter(
    (span) => span.traceId === "0af7651916cd43dd8448eb211c80319c",
  );
  const root = remote.find(
    (span) => span.name === "generate" && kind(span) === "agent",
  );
  assert(root !== undefined, "the remote-parented call was not exported");
  assert(!(root as DecodedSpan).parentSpanId, "the root kept a parent");
  const attempt = remote.find((span) => span.name === "generate.attempt");
  assertEqual(attempt?.parentSpanId, (root as DecodedSpan).spanId);
});

await test("two NeuroLink instances never register a second exporter", async () => {
  const run = await runHost({ HOST_PROCESSOR: "1", HOST_KEYS: "1" });
  assert(run.sends.size > 0, "nothing was delivered");
  for (const [spanId, count] of run.sends) {
    assertEqual(count, 1, `span ${spanId} was delivered more than once`);
  }
});

await test("a host provider without Langfuse configured registers no exporter, is unhealthy and sends nothing", async () => {
  const run = await runHost({ HOST_PROCESSOR: "1" });
  assert(!run.status.isHealthy, "health claimed an exporter that is not there");
  assert(!run.status.hasProcessor, "an exporter was registered without keys");
  assertEqual(run.spans.length, 0, "spans were exported without keys");
  // The receiver is addressed through LANGFUSE_BASE_URL in both runs; only the
  // keys differ, so the silence above is not just an unreachable receiver.
  const keyed = await runHost({
    HOST_PROCESSOR: "1",
    LANGFUSE_PUBLIC_KEY: "pk-env",
    LANGFUSE_SECRET_KEY: "sk-env",
  });
  assert(keyed.spans.length > 0, "keys in the environment exported nothing");
});

await runSuite();
