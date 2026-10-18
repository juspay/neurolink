#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Observability, CLI status and test-gap coverage
 *
 * Drives only what the package ships: the built entry `../dist/index.js`
 * (in-process for the host-provider checks, in child processes for everything
 * that needs its own telemetry state) and the built CLI `dist/cli/index.js`,
 * against local stand-ins: an OpenAI-compatible chat server and a Langfuse
 * OTLP receiver that decodes what NeuroLink's own exporter posts. Nothing is
 * imported from `src/`, so the suite needs no determinism exception; it needs
 * `pnpm run build` first.
 *
 * Every check prints exactly one `PROOF <id> PASS|FAIL <description>` line and
 * the process exits non-zero if any check failed. No keys, no live calls.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-observability-w2-tests-cli.ts
 */
import "./helpers/credentialFreeEnv.js";
import { spawn } from "node:child_process";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { tempDir } from "./helpers/harness.js";
import type { SpanData } from "../dist/index.js";

assertDistFresh();

const ROOT = process.cwd();
const DIST_INDEX = join(ROOT, "dist/index.js");
const CLI = join(ROOT, "dist/cli/index.js");

type Json =
  | string
  | number
  | boolean
  | null
  | undefined
  | Json[]
  | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

type DecodedSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  statusCode: number;
  attributes: JsonObject;
};
type Hit = { path: string; status: number; spans: DecodedSpan[] };
type ReceiverMode = "ok" | "throttled" | "reset" | "down";
type Receiver = {
  baseUrl: string;
  hits: Hit[];
  sends: Map<string, number>;
  spans: () => DecodedSpan[];
  close: () => Promise<void>;
};
type ChildResult = { exitCode: number; stdout: string; stderr: string };
type ExporterStatusJson = {
  name: string;
  enabled: boolean;
  healthy: boolean;
  pendingSpans: number;
  deliveredSpans: number;
  failedSpans: number;
  lastExportTime?: string;
  errors?: string[];
};

// ---------------------------------------------------------------------------
// PROOF reporting
// ---------------------------------------------------------------------------

let failures = 0;

// W2_ONLY=K38|X06 runs just those checks (an id or a part of a description).
const only = (process.env.W2_ONLY ?? "").split("|").filter(Boolean);

async function check(
  id: string,
  description: string,
  run: () => void | Promise<void>,
): Promise<void> {
  if (
    only.length > 0 &&
    !only.some((part) => part === id || description.includes(part))
  ) {
    return;
  }
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

function objectOf(value: unknown, what: string): JsonObject {
  expect(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${what} is not an object`,
  );
  return value as JsonObject;
}

// ---------------------------------------------------------------------------
// Local OpenAI-compatible chat server
// ---------------------------------------------------------------------------

function listen(server: Server): Promise<number> {
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    }),
  );
}

function readBody(req: IncomingMessage): Promise<JsonObject> {
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

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });
}

/** `tool12` asks for twelve lookups in its first reply, `tool1` for one. */
function toolCountOf(model: string): number {
  const match = /^tool(\d+)$/.exec(model);
  return match ? Number(match[1]) : 0;
}

function toolCalls(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `call_${index + 1}`,
    type: "function",
    function: {
      name: "lookup",
      arguments: JSON.stringify({ q: `needle-${index + 1}` }),
    },
  }));
}

function chatBody(model: string, calling: number) {
  const length = model === "length-model";
  return {
    id: "chatcmpl-fake",
    object: "chat.completion",
    created: 1,
    model,
    choices: [
      {
        index: 0,
        message:
          calling > 0
            ? {
                role: "assistant",
                content: null,
                tool_calls: toolCalls(calling),
              }
            : { role: "assistant", content: "hello there" },
        finish_reason: calling > 0 ? "tool_calls" : length ? "length" : "stop",
      },
    ],
    usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 },
  };
}

function frame(model: string, delta: object, finish: string | null): string {
  return `data: ${JSON.stringify({
    id: "chatcmpl-fake",
    object: "chat.completion.chunk",
    created: 1,
    model,
    choices: [{ index: 0, delta, finish_reason: finish }],
  })}\n\n`;
}

function streamBody(res: ServerResponse, model: string, calling: number): void {
  res.writeHead(200, { "content-type": "text/event-stream" });
  if (calling > 0) {
    res.write(
      frame(
        model,
        {
          role: "assistant",
          tool_calls: toolCalls(calling).map((call, index) => ({
            index,
            ...call,
          })),
        },
        null,
      ),
    );
    res.write(frame(model, {}, "tool_calls"));
  } else {
    res.write(frame(model, { role: "assistant", content: "hello" }, null));
    res.write(frame(model, { content: " there" }, null));
    res.write(frame(model, {}, model === "length-model" ? "length" : "stop"));
  }
  res.write(
    `data: ${JSON.stringify({
      id: "chatcmpl-fake",
      object: "chat.completion.chunk",
      created: 1,
      model,
      choices: [],
      usage: { prompt_tokens: 9, completion_tokens: 4, total_tokens: 13 },
    })}\n\n`,
  );
  res.end("data: [DONE]\n\n");
}

async function startOpenAI(): Promise<{
  baseURL: string;
  requests: JsonObject[];
  close: () => Promise<void>;
}> {
  const requests: JsonObject[] = [];
  const server = createServer(async (req, res) => {
    const body = await readBody(req);
    requests.push(body);
    const model = String(body.model ?? "gpt-4o-mini");
    const answered = JSON.stringify(body.messages ?? []).includes(
      "tool_call_id",
    );
    const calling = answered ? 0 : toolCountOf(model);
    if (body.stream === true) {
      streamBody(res, model, calling);
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(chatBody(model, calling)));
  });
  const port = await listen(server);
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    requests,
    close: () => closeServer(server),
  };
}

// ---------------------------------------------------------------------------
// Local Langfuse OTLP receiver
// ---------------------------------------------------------------------------

function decodeValue(value: JsonObject): Json | undefined {
  if (value.arrayValue) {
    const values = (value.arrayValue as { values?: JsonObject[] }).values;
    return (values ?? []).map(decodeValue);
  }
  if (value.intValue !== undefined) {
    return Number(value.intValue);
  }
  return value.stringValue ?? value.doubleValue ?? value.boolValue;
}

function decodeSpans(payload: JsonObject): DecodedSpan[] {
  type Raw = {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    name: string;
    status: { code: number };
    attributes: { key: string; value: JsonObject }[];
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

async function startReceiver(mode: ReceiverMode = "ok"): Promise<Receiver> {
  const hits: Hit[] = [];
  const sends = new Map<string, number>();
  let requests = 0;
  const server = createServer(async (req, res) => {
    const spans = decodeSpans(await readBody(req));
    requests += 1;
    const answer = (status: number): void => {
      hits.push({ path: req.url ?? "", status, spans });
      res.writeHead(status, { "content-type": "application/json" });
      res.end("{}");
    };
    if (mode === "down") {
      answer(500);
      return;
    }
    if (mode === "throttled" && requests === 1) {
      answer(429);
      return;
    }
    if (mode === "reset" && requests === 1) {
      hits.push({ path: req.url ?? "", status: 0, spans });
      req.socket.destroy();
      return;
    }
    spans.forEach((span) =>
      sends.set(span.spanId, (sends.get(span.spanId) ?? 0) + 1),
    );
    answer(200);
  });
  const port = await listen(server);
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    hits,
    sends,
    spans: () => hits.flatMap((hit) => hit.spans),
    close: () => closeServer(server),
  };
}

// ---------------------------------------------------------------------------
// Child processes
// ---------------------------------------------------------------------------

function run(
  command: string,
  args: string[],
  env: Record<string, string>,
  timeoutMs = 90_000,
): Promise<ChildResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        DOTENV_CONFIG_PATH: "/dev/null",
        NEUROLINK_SKIP_MCP: "true",
        NEUROLINK_DISABLE_UPDATE_CHECK: "1",
        ...env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${args.join(" ")} did not finish in ${timeoutMs}ms`));
    }, timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });
  });
}

/**
 * One NeuroLink process: any number of generates, optionally a streamed tool
 * turn or two memory turns, then either a flush or the built CLI run in the
 * same process, so the CLI sees the spans this process produced.
 */
const TRAFFIC = join(tempDir("neurolink-w2-traffic-"), "traffic.mjs");
writeFileSync(
  TRAFFIC,
  `
import { pathToFileURL } from "node:url";
import { NeuroLink, flushOpenTelemetry, getLangfuseHealthStatus, jsonSchema, shutdownOpenTelemetry } from ${JSON.stringify(
    pathToFileURL(DIST_INDEX).href,
  )};
const env = process.env;
const obs = env.W2_OBS ? JSON.parse(env.W2_OBS.split("__INGEST__").join(env.W2_INGEST_URL)) : undefined;
const config = {};
if (obs) config.observability = obs;
if (env.W2_MEMORY === "1") config.conversationMemory = { enabled: true, enableSummarization: false };
const nl = new NeuroLink(Object.keys(config).length > 0 ? config : undefined);
const credentials = { openai: { apiKey: "k", baseURL: env.W2_OPENAI_URL } };
const extra = env.W2_EXTRA ? JSON.parse(env.W2_EXTRA) : {};
const call = (model, more = {}) => ({ input: { text: "hi" }, provider: "openai", model, credentials, disableTools: true, disableInternalFallback: true, ...extra, ...more });
const drain = async (stream) => { for await (const chunk of stream) void chunk; };
const result = env.W2_TOOL_RESULT === "iserror" ? { isError: true, content: [{ type: "text", text: "Not found: lookup needle" }] } : { found: true };
const tools = { lookup: { description: "look a value up", inputSchema: jsonSchema({ type: "object", properties: { q: { type: "string" } }, additionalProperties: true }), execute: async () => result } };
const calls = Number(env.W2_CALLS ?? "0");
const model = env.W2_MODEL ?? "gpt-4o-mini";
for (let done = 0; done < calls; done += 10) {
  await Promise.all(Array.from({ length: Math.min(10, calls - done) }, () => nl.generate(call(model))));
}
if (env.W2_TOOL_MODEL) {
  const turn = await nl.stream(call(env.W2_TOOL_MODEL, { disableTools: false, maxSteps: 3, tools }));
  await drain(turn.stream);
}
if (env.W2_MEMORY === "1") {
  const context = { sessionId: "w2-memory-session", userId: "w2-user" };
  await nl.generate(call(model, { context }));
  await nl.generate(call(model, { context }));
}
console.log("HEALTH " + JSON.stringify(getLangfuseHealthStatus()));
console.log("STATUS_BEFORE " + JSON.stringify(nl.getTelemetryStatus()));
if (env.W2_CLI_ARGS) {
  setTimeout(() => process.exit(process.exitCode ?? 0), 30000).unref();
  process.argv = [process.argv[0], ${JSON.stringify(CLI)}, ...env.W2_CLI_ARGS.split(" ")];
  await import(pathToFileURL(${JSON.stringify(CLI)}).href);
} else {
  await flushOpenTelemetry().catch(() => undefined);
  console.log("STATUS_AFTER " + JSON.stringify(nl.getTelemetryStatus()));
  await shutdownOpenTelemetry();
  process.exit(0);
}
`,
);

const fake = await startOpenAI();

type TrafficOptions = {
  mode?: ReceiverMode;
  env?: Record<string, string>;
  /** Observability config; `__INGEST__` stands for the receiver URL. */
  obs?: object;
};
type Traffic = {
  receiver: Receiver;
  result: ChildResult;
  statusBefore: JsonObject;
  statusAfter: JsonObject | undefined;
  health: JsonObject;
};

function lineOf(stdout: string, prefix: string): JsonObject | undefined {
  const line = stdout.split("\n").find((entry) => entry.startsWith(prefix));
  return line
    ? objectOf(JSON.parse(line.slice(prefix.length)), prefix.trim())
    : undefined;
}

async function runTraffic(options: TrafficOptions = {}): Promise<Traffic> {
  const receiver = await startReceiver(options.mode);
  try {
    const result = await run(process.execPath, [TRAFFIC], {
      W2_INGEST_URL: receiver.baseUrl,
      W2_OPENAI_URL: fake.baseURL,
      ...(options.obs ? { W2_OBS: JSON.stringify(options.obs) } : {}),
      ...options.env,
    });
    expect(result.exitCode === 0, "the traffic process failed");
    const statusBefore = lineOf(result.stdout, "STATUS_BEFORE ");
    const health = lineOf(result.stdout, "HEALTH ");
    expect(statusBefore !== undefined, "the process printed no status");
    expect(health !== undefined, "the process printed no health");
    return {
      receiver,
      result,
      statusBefore,
      statusAfter: lineOf(result.stdout, "STATUS_AFTER "),
      health,
    };
  } finally {
    await receiver.close();
  }
}

const KEYS = { publicKey: "pk-w2", secretKey: "sk-w2" };
const langfuseConfig = (extra: object = {}) => ({
  langfuse: { ...KEYS, baseUrl: "__INGEST__", ...extra },
});

function exportersOf(status: JsonObject | undefined): ExporterStatusJson[] {
  expect(status !== undefined, "no status was printed");
  const list = (status as JsonObject).exporters;
  expect(Array.isArray(list), "getTelemetryStatus() has no exporters list");
  return (list as Json[]).map((entry) => {
    const item = objectOf(entry, "exporter entry");
    return {
      name: String(item.name),
      enabled: item.enabled === true,
      healthy: item.healthy === true,
      pendingSpans: Number(item.pendingSpans),
      deliveredSpans: Number(item.deliveredSpans),
      failedSpans: Number(item.failedSpans),
      lastExportTime:
        typeof item.lastExportTime === "string"
          ? item.lastExportTime
          : undefined,
      errors: Array.isArray(item.errors) ? item.errors.map(String) : undefined,
    };
  });
}

function langfuseOf(status: JsonObject | undefined): ExporterStatusJson {
  const found = exportersOf(status).find((entry) => entry.name === "langfuse");
  expect(found !== undefined, "no langfuse exporter is listed");
  return found as ExporterStatusJson;
}

function cliJson(stdout: string): JsonObject {
  const match = /^\{[\s\S]*?^\}/m.exec(stdout);
  expect(match !== null, "the CLI printed no JSON object");
  return objectOf(JSON.parse((match as RegExpExecArray)[0]), "CLI JSON");
}

const kind = (span: DecodedSpan): Json | undefined =>
  span.attributes["langfuse.observation.type"];

// ---------------------------------------------------------------------------
// K35: the status commands list the registered exporters, flush reports counts
// ---------------------------------------------------------------------------

section("K35");
function section(name: string): void {
  console.log(`# ${name}`);
}

const LANGFUSE_ENV = (receiver: Receiver): Record<string, string> => ({
  LANGFUSE_PUBLIC_KEY: KEYS.publicKey,
  LANGFUSE_SECRET_KEY: KEYS.secretKey,
  LANGFUSE_BASE_URL: receiver.baseUrl,
});

async function runCli(
  args: string[],
  receiver: Receiver,
  keys: boolean,
): Promise<ChildResult> {
  return run(process.execPath, [CLI, ...args], {
    ...(keys
      ? LANGFUSE_ENV(receiver)
      : { LANGFUSE_BASE_URL: receiver.baseUrl }),
  });
}

await check(
  "K35",
  "telemetry status --format json lists the registered Langfuse exporter and sends nothing",
  async () => {
    const receiver = await startReceiver();
    try {
      const out = await runCli(
        ["telemetry", "status", "--format", "json", "--quiet"],
        receiver,
        true,
      );
      expect(out.exitCode === 0, "telemetry status failed");
      const json = cliJson(out.stdout);
      expect(json.enabled === true, "telemetry is reported as disabled");
      const entry = langfuseOf(json);
      expect(entry.enabled, "the exporter is not reported as running");
      expect(entry.healthy, "the exporter is not reported as healthy");
      expect(entry.pendingSpans === 0, "a fresh process has pending spans");
      expect(
        entry.deliveredSpans === 0 && entry.failedSpans === 0,
        "a fresh process reports delivery counts",
      );
      expect(receiver.hits.length === 0, "status sent a request");
    } finally {
      await receiver.close();
    }
  },
);

await check(
  "K35",
  "observability status --format json lists the registered Langfuse exporter",
  async () => {
    const receiver = await startReceiver();
    try {
      const out = await runCli(
        ["observability", "status", "--format", "json", "--quiet"],
        receiver,
        true,
      );
      expect(out.exitCode === 0, "observability status failed");
      const entry = langfuseOf(cliJson(out.stdout));
      expect(entry.enabled && entry.healthy, "the exporter is not healthy");
    } finally {
      await receiver.close();
    }
  },
);

await check(
  "K35",
  "telemetry status and observability status print an Exporters section in text",
  async () => {
    const receiver = await startReceiver();
    try {
      for (const group of ["telemetry", "observability"]) {
        const out = await runCli([group, "status", "--quiet"], receiver, true);
        expect(out.exitCode === 0, `${group} status failed`);
        const text = out.stdout;
        expect(/Exporters:/.test(text), `${group} status has no Exporters`);
        expect(/langfuse/.test(text), `${group} status omits langfuse`);
      }
    } finally {
      await receiver.close();
    }
  },
);

await check(
  "K35",
  "without Langfuse keys the status lists no exporters",
  async () => {
    const receiver = await startReceiver();
    try {
      const out = await runCli(
        ["telemetry", "status", "--format", "json", "--quiet"],
        receiver,
        false,
      );
      expect(out.exitCode === 0, "telemetry status failed");
      expect(
        exportersOf(cliJson(out.stdout)).length === 0,
        "an exporter is listed without keys",
      );
      expect(receiver.hits.length === 0, "status sent a request");
    } finally {
      await receiver.close();
    }
  },
);

await check(
  "K35",
  "telemetry flush --format json keeps success, pendingBefore, pendingAfter and flushed",
  async () => {
    const receiver = await startReceiver();
    try {
      const out = await runCli(
        ["telemetry", "flush", "--format", "json", "--quiet"],
        receiver,
        true,
      );
      expect(out.exitCode === 0, "telemetry flush failed");
      const json = cliJson(out.stdout);
      expect(json.success === true, "success is not true");
      for (const field of ["pendingBefore", "pendingAfter", "flushed"]) {
        expect(
          json[field] === 0,
          `${field} is ${String(json[field])}, expected 0 in an idle process`,
        );
      }
    } finally {
      await receiver.close();
    }
  },
);

await check(
  "K35",
  "getTelemetryStatus().exporters counts what was queued, delivered and nothing else",
  async () => {
    const run1 = await runTraffic({
      env: { W2_CALLS: "3" },
      obs: langfuseConfig({ flushAt: 2000, flushInterval: 600 }),
    });
    const before = langfuseOf(run1.statusBefore);
    const after = langfuseOf(run1.statusAfter);
    const received = run1.receiver.spans().length;
    expect(received > 0, "the receiver got no spans");
    expect(
      before.pendingSpans === received,
      `before the flush ${before.pendingSpans} are queued, ${received} arrive`,
    );
    expect(before.deliveredSpans === 0, "delivery counted before any send");
    expect(
      after.deliveredSpans === received,
      `delivered ${after.deliveredSpans}, the receiver decoded ${received}`,
    );
    expect(after.pendingSpans === 0, "spans are still pending after flush");
    expect(after.failedSpans === 0, "a failure is counted on a clean flush");
    expect(after.healthy, "a clean exporter is reported unhealthy");
    expect(
      after.lastExportTime !== undefined &&
        !Number.isNaN(Date.parse(after.lastExportTime)),
      "lastExportTime is not a date",
    );
  },
);

await check(
  "K35",
  "telemetry flush run by the CLI after traffic reports the spans it flushed",
  async () => {
    const traffic = await runTraffic({
      env: {
        W2_CALLS: "3",
        W2_CLI_ARGS: "telemetry flush --format json --quiet",
      },
      obs: langfuseConfig({ flushAt: 2000, flushInterval: 600 }),
    });
    const queued = langfuseOf(traffic.statusBefore).pendingSpans;
    const received = traffic.receiver.spans().length;
    const json = cliJson(traffic.result.stdout);
    expect(queued > 0 && received === queued, "the setup queued no spans");
    expect(json.pendingBefore === queued, "pendingBefore is not the queue");
    expect(json.pendingAfter === 0, "pendingAfter is not 0");
    expect(json.flushed === received, "flushed is not the delivered count");
    expect(json.dropped === 0, "dropped is not 0 on a clean flush");
    expect(json.success === true, "success is not true");
  },
);

await check(
  "K35",
  "an unreachable Langfuse is reported as failed spans, not as flushed",
  async () => {
    const down = await runTraffic({
      mode: "down",
      env: { W2_CALLS: "2" },
      obs: langfuseConfig({
        flushAt: 2000,
        flushInterval: 600,
        flushBudgetMs: 1500,
      }),
    });
    const queued = langfuseOf(down.statusBefore).pendingSpans;
    const after = langfuseOf(down.statusAfter);
    expect(queued > 0, "the setup queued no spans");
    expect(after.deliveredSpans === 0, "undelivered spans count as delivered");
    expect(after.failedSpans === queued, "the dropped spans are not counted");
    expect(!after.healthy, "an exporter that dropped spans is healthy");
    expect((after.errors ?? []).length > 0, "no error is reported");

    const cli = await runTraffic({
      mode: "down",
      env: {
        W2_CALLS: "2",
        W2_CLI_ARGS: "telemetry flush --format json --quiet",
      },
      obs: langfuseConfig({
        flushAt: 2000,
        flushInterval: 600,
        flushBudgetMs: 1500,
      }),
    });
    const json = cliJson(cli.result.stdout);
    expect(json.flushed === 0, "undelivered spans are reported as flushed");
    expect(
      typeof json.dropped === "number" && json.dropped > 0,
      "the dropped spans are not reported",
    );
  },
);

// ---------------------------------------------------------------------------
// K37: egress without keys, retry on 429 and network errors, chunking, 12 tools
// ---------------------------------------------------------------------------

section("K37");

await check(
  "K37",
  "with the receiver addressed but no keys set, nothing is sent; with keys the same setup delivers",
  async () => {
    const receiver = await startReceiver();
    try {
      const base = {
        W2_INGEST_URL: receiver.baseUrl,
        W2_OPENAI_URL: fake.baseURL,
        W2_CALLS: "3",
        LANGFUSE_BASE_URL: receiver.baseUrl,
      };
      const silent = await run(process.execPath, [TRAFFIC], base);
      expect(silent.exitCode === 0, "the keyless process failed");
      expect(receiver.hits.length === 0, "spans left without keys");
      expect(
        lineOf(silent.stdout, "HEALTH ")?.hasProcessor === false,
        "an exporter was registered without keys",
      );
      const control = await run(process.execPath, [TRAFFIC], {
        ...base,
        ...LANGFUSE_ENV(receiver),
      });
      expect(control.exitCode === 0, "the control process failed");
      expect(
        receiver.spans().length > 0,
        "the receiver cannot see spans, so the silence above proves nothing",
      );
    } finally {
      await receiver.close();
    }
  },
);

await check(
  "K37",
  "observability langfuse false sends nothing even with keys and an addressed receiver",
  async () => {
    const receiver = await startReceiver();
    try {
      const off = await run(process.execPath, [TRAFFIC], {
        W2_INGEST_URL: receiver.baseUrl,
        W2_OPENAI_URL: fake.baseURL,
        W2_CALLS: "3",
        W2_OBS: JSON.stringify({ langfuse: false }),
        ...LANGFUSE_ENV(receiver),
      });
      expect(off.exitCode === 0, "the process failed");
      expect(receiver.hits.length === 0, "spans left with langfuse false");
      expect(
        lineOf(off.stdout, "HEALTH ")?.hasProcessor === false,
        "langfuse false still registered an exporter",
      );
    } finally {
      await receiver.close();
    }
  },
);

await check(
  "K37",
  "a 429 is retried and every span is delivered once",
  async () => {
    const throttled = await runTraffic({
      mode: "throttled",
      env: { W2_CALLS: "1" },
      obs: langfuseConfig({ flushBudgetMs: 10_000 }),
    });
    const { hits, sends } = throttled.receiver;
    expect(hits[0]?.status === 429, "the first request was not throttled");
    expect(
      hits.some((hit) => hit.status === 200),
      "the throttled batch was never retried",
    );
    expect(sends.size > 0, "nothing was delivered");
    for (const [spanId, count] of sends) {
      expect(count === 1, `span ${spanId} was delivered ${count} times`);
    }
  },
);

await check(
  "K37",
  "a dropped connection is retried and every span is delivered once",
  async () => {
    const reset = await runTraffic({
      mode: "reset",
      env: { W2_CALLS: "1" },
      obs: langfuseConfig({ flushBudgetMs: 10_000 }),
    });
    const { hits, sends } = reset.receiver;
    expect(hits[0]?.status === 0, "the first connection was not dropped");
    expect(
      hits.some((hit) => hit.status === 200),
      "the dropped batch was never retried",
    );
    expect(sends.size > 0, "nothing was delivered");
    for (const [spanId, count] of sends) {
      expect(count === 1, `span ${spanId} was delivered ${count} times`);
    }
  },
);

await check(
  "K37",
  "a batch over the 500-span request cap is split into requests of at most 500",
  async () => {
    const big = await runTraffic({
      env: { W2_CALLS: "150" },
      obs: langfuseConfig({ flushAt: 5000, flushInterval: 600 }),
    });
    const total = big.receiver.spans().length;
    expect(
      total > 500,
      `only ${total} spans were sent, the cap is not reached`,
    );
    expect(
      new Set(big.receiver.spans().map((span) => span.spanId)).size === total,
      "a span was sent twice",
    );
    expect(big.receiver.hits.length >= 2, "the batch went out as one request");
    for (const hit of big.receiver.hits) {
      expect(hit.spans.length <= 500, `a request carried ${hit.spans.length}`);
    }
    for (const [spanId, count] of big.receiver.sends) {
      expect(count === 1, `span ${spanId} was delivered ${count} times`);
    }
  },
);

await check(
  "K37",
  "twelve tool lookups in one step are twelve tool observations under that step",
  async () => {
    const twelve = await runTraffic({
      env: { W2_TOOL_MODEL: "tool12" },
      obs: langfuseConfig(),
    });
    const spans = twelve.receiver.spans();
    const tools = spans.filter((span) => kind(span) === "tool");
    expect(tools.length === 12, `${tools.length} tool observations, not 12`);
    expect(
      new Set(tools.map((span) => span.spanId)).size === 12,
      "tool observations share a span",
    );
    const parents = new Set(tools.map((span) => span.parentSpanId));
    expect(parents.size === 1, "the tools are not all under the same step");
    const step = spans.find((span) => span.spanId === [...parents][0]);
    expect(step?.name === "step", "the tools are not under a step span");
    const inputs = tools.map((span) =>
      String(span.attributes["langfuse.observation.input"]),
    );
    for (let index = 1; index <= 12; index += 1) {
      expect(
        inputs.some((input) => input.includes(`needle-${index}`)),
        `lookup ${index} has no observation with its own arguments`,
      );
    }
    for (const span of tools) {
      expect(
        span.attributes["langfuse.observation.output"] !== undefined,
        "a tool observation has no output",
      );
      expect(span.name === "lookup", "a tool is not named after the tool");
    }
    expect(
      spans.filter((span) => span.name === "step").length === 2,
      "expected the asking step and the answering step",
    );
  },
);

// ---------------------------------------------------------------------------
// K38: replacement tests for the deleted base tests
// ---------------------------------------------------------------------------

section("K38");

const SINK = pathToFileURL(join(ROOT, "dist/proxy/otelLogSink.js")).href;

function sinkScript(endpoint: string): string {
  return `
import { registerHooks } from "node:module";
let sdkLogsLoaded = false;
registerHooks({
  load(url, context, next) {
    if (url.includes("/@opentelemetry/sdk-logs/")) sdkLogsLoaded = true;
    return next(url, context);
  },
});
process.env.NEUROLINK_PROXY_LOG_SINK = "otel";
process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = ${JSON.stringify(endpoint)};
const { initializeProxyOtelLogs } = await import(${JSON.stringify(SINK)});
let message = "";
try { initializeProxyOtelLogs(); } catch (error) { message = error instanceof Error ? error.message : String(error); }
console.log("SINK " + JSON.stringify({ message, sdkLogsLoaded }));
process.exit(0);
`;
}

async function sinkOutcome(
  endpoint: string,
): Promise<{ message: string; sdkLogsLoaded: boolean }> {
  const out = await run(
    process.execPath,
    ["--input-type=module", "-e", sinkScript(endpoint)],
    {},
  );
  expect(out.exitCode === 0, "the sink script failed");
  const line = lineOf(out.stdout, "SINK ");
  expect(line !== undefined, "the sink script printed no outcome");
  return {
    message: String((line as JsonObject).message),
    sdkLogsLoaded: (line as JsonObject).sdkLogsLoaded === true,
  };
}

const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
const hooksAvailable = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 15);

if (hooksAvailable) {
  await check(
    "K38",
    "a cleartext non-loopback OTLP logs endpoint is refused before the SDK is loaded",
    async () => {
      const refused = await sinkOutcome("http://example.com/v1/logs");
      expect(/HTTPS/.test(refused.message), "the endpoint was not refused");
      expect(!refused.sdkLogsLoaded, "the SDK loaded before validation");
    },
  );

  await check(
    "K38",
    "a loopback http endpoint and an https endpoint pass validation and load the SDK",
    async () => {
      for (const endpoint of [
        "http://127.0.0.1:4318/v1/logs",
        "https://collector.example.com/v1/logs",
      ]) {
        const accepted = await sinkOutcome(endpoint);
        expect(!/HTTPS/.test(accepted.message), `${endpoint} was refused`);
        expect(
          accepted.sdkLogsLoaded,
          `${endpoint} did not load the SDK, so the hook proves nothing`,
        );
      }
    },
  );
} else {
  console.log(
    `PROOF K38 SKIP OTLP logs validation needs Node 22.15 for module hooks, running ${process.version}`,
  );
}

await check(
  "K38",
  "conversation memory spans are not observations, so they stay out of Langfuse while each turn keeps its generate trace",
  async () => {
    const memory = await runTraffic({
      env: { W2_MEMORY: "1" },
      obs: langfuseConfig(),
    });
    const spans = memory.receiver.spans();
    const roots = new Set(
      spans
        .filter((span) => span.name === "generate" && kind(span) === "agent")
        .map((span) => span.traceId),
    );
    expect(roots.size === 2, `${roots.size} generate traces, expected 2`);
    const helpers = spans.filter((span) => span.name.startsWith("memory."));
    expect(
      helpers.length === 0,
      `${helpers.map((span) => span.name).join(", ")} reached Langfuse although they are not observations`,
    );
  },
);

await check(
  "K38",
  "a tool that returns an isError result is an ERROR tool observation with the error text",
  async () => {
    const failed = await runTraffic({
      env: { W2_TOOL_MODEL: "tool1", W2_TOOL_RESULT: "iserror" },
      obs: langfuseConfig(),
    });
    const tools = failed.receiver
      .spans()
      .filter((span) => kind(span) === "tool");
    expect(tools.length === 1, `${tools.length} tool observations`);
    expect(
      tools[0].attributes["langfuse.observation.level"] === "ERROR",
      "the failed tool is not at level ERROR",
    );
    expect(
      String(
        tools[0].attributes["langfuse.observation.status_message"],
      ).includes("Not found"),
      "the status message does not carry the tool's error",
    );
  },
);

// ---------------------------------------------------------------------------
// K39: the finish reason and the system-prompt floor on the generation record
// ---------------------------------------------------------------------------

section("K39");

const FINISH = "langfuse.observation.metadata.finishReason";

await check(
  "K39",
  "every generation records the provider's finish reason in its metadata",
  async () => {
    const tools = await runTraffic({
      env: { W2_TOOL_MODEL: "tool1" },
      obs: langfuseConfig(),
    });
    const generations = tools.receiver
      .spans()
      .filter((span) => kind(span) === "generation");
    expect(generations.length === 2, `${generations.length} generations`);
    const reasons = generations
      .map((span) => String(span.attributes[FINISH]))
      .sort();
    expect(
      reasons.join(",") === "stop,tool_calls",
      `finish reasons were ${reasons.join(",")}`,
    );
    for (const span of generations) {
      expect(
        span.attributes["langfuse.observation.metadata.provider"] === "openai",
        "the provider metadata was lost",
      );
    }
  },
);

await check(
  "K39",
  "a length finish keeps its reason and the WARNING level on the generation",
  async () => {
    const length = await runTraffic({
      env: { W2_CALLS: "1", W2_MODEL: "length-model" },
      obs: langfuseConfig(),
    });
    const generation = length.receiver
      .spans()
      .find((span) => kind(span) === "generation");
    expect(generation !== undefined, "no generation was exported");
    expect(
      (generation as DecodedSpan).attributes[FINISH] === "length",
      "the finish reason is missing",
    );
    expect(
      (generation as DecodedSpan).attributes["langfuse.observation.level"] ===
        "WARNING",
      "the level is not WARNING",
    );
  },
);

// ---------------------------------------------------------------------------
// X48: the built CLI delivers a generate to Langfuse when keys are set
// ---------------------------------------------------------------------------

section("X48");

async function cliGenerate(
  receiver: Receiver,
  keys: boolean,
): Promise<ChildResult> {
  return run(
    process.execPath,
    [
      CLI,
      "generate",
      "Say hello",
      "--provider",
      "openai",
      "--model",
      "gpt-4o-mini",
      "--max-tokens",
      "50",
      "--disableTools",
    ],
    {
      OPENAI_API_KEY: "k",
      OPENAI_BASE_URL: fake.baseURL,
      LANGFUSE_BASE_URL: receiver.baseUrl,
      ...(keys
        ? {
            LANGFUSE_PUBLIC_KEY: KEYS.publicKey,
            LANGFUSE_SECRET_KEY: KEYS.secretKey,
          }
        : {}),
    },
  );
}

await check(
  "X48",
  "neurolink generate posts its trace to Langfuse once the keys are set, and sends nothing without them",
  async () => {
    const withKeys = await startReceiver();
    const without = await startReceiver();
    try {
      const sent = await cliGenerate(withKeys, true);
      const silent = await cliGenerate(without, false);
      expect(sent.exitCode === 0, "generate with keys failed");
      expect(silent.exitCode === 0, "generate without keys failed");
      expect(/hello there/.test(sent.stdout), "the reply is not on stdout");
      expect(/hello there/.test(silent.stdout), "no reply without keys");
      expect(withKeys.hits.length >= 1, "no trace reached Langfuse");
      expect(without.hits.length === 0, "a trace left without keys");
      for (const hit of withKeys.hits) {
        expect(hit.path === "/api/public/otel/v1/traces", "wrong ingest path");
      }
      const spans = withKeys.spans();
      const root = spans.find(
        (span) => span.name === "generate" && kind(span) === "agent",
      );
      expect(root !== undefined, "the trace has no generate root");
      expect(
        String(
          (root as DecodedSpan).attributes["langfuse.observation.output"],
        ).includes("hello there"),
        "the root does not carry the reply",
      );
      expect(
        spans.some((span) => kind(span) === "generation"),
        "the trace has no generation",
      );
    } finally {
      await withKeys.close();
      await without.close();
    }
  },
);

// ---------------------------------------------------------------------------
// X50: identity and environment come from NeuroLink's own pipeline
// ---------------------------------------------------------------------------

section("X50");

await check(
  "X50",
  "every span NeuroLink exports carries user, session, tags, metadata, environment and release",
  async () => {
    const identity = await runTraffic({
      env: {
        W2_CALLS: "1",
        W2_TOOL_MODEL: "tool1",
        W2_EXTRA: JSON.stringify({
          context: {
            userId: "u-w2",
            sessionId: "s-w2",
            tags: ["t-w2"],
            metadata: { feature: "w2" },
          },
        }),
        LANGFUSE_TRACING_ENVIRONMENT: "env-w2",
        LANGFUSE_RELEASE: "rel-w2",
      },
      obs: langfuseConfig(),
    });
    const spans = identity.receiver.spans();
    expect(spans.length > 4, "too few spans to test the observations");
    for (const span of spans) {
      const who = `${span.name} (${String(kind(span))})`;
      expect(span.attributes["user.id"] === "u-w2", `${who} user.id`);
      expect(span.attributes["session.id"] === "s-w2", `${who} session.id`);
      expect(
        String(span.attributes["langfuse.trace.tags"]) === "t-w2",
        `${who} tags`,
      );
      expect(
        span.attributes["langfuse.trace.metadata.feature"] === "w2",
        `${who} metadata`,
      );
      expect(
        span.attributes["langfuse.environment"] === "env-w2",
        `${who} environment`,
      );
      expect(
        span.attributes["langfuse.release"] === "rel-w2",
        `${who} release`,
      );
    }
  },
);

// In-process: a host provider that carries only NeuroLink's own processor, so
// nothing from @langfuse/otel can copy the identity onto a span.
const dist = await import("../dist/index.js");

class RecordingExporter extends dist.NoOpExporter {
  readonly spans: SpanData[] = [];

  override async exportSpan(span: SpanData) {
    this.spans.push(span);
    return super.exportSpan(span);
  }
}

/** Resolves once `count` stops growing, so asynchronous exports have landed. */
async function settled(count: () => number): Promise<void> {
  let previous = -1;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const current = count();
    if (current > 0 && current === previous) {
      return;
    }
    previous = current;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

const hostRegistry = new dist.ExporterRegistry();
const recorder = new RecordingExporter();
await recorder.initialize();
hostRegistry.register(recorder);
const hostProvider = new NodeTracerProvider({
  spanProcessors: [dist.createExporterSpanProcessor(hostRegistry)],
});
hostProvider.register();

await check(
  "X50",
  "NeuroLink's own span processor copies user, session, tags and metadata onto every exported span",
  async () => {
    const nl = new dist.NeuroLink();
    await nl.generate({
      input: { text: "hi" },
      provider: "openai",
      model: "gpt-4o-mini",
      credentials: { openai: { apiKey: "k", baseURL: fake.baseURL } },
      disableTools: true,
      disableInternalFallback: true,
      context: {
        userId: "u-host",
        sessionId: "s-host",
        tags: ["t-host"],
        metadata: { feature: "host" },
      },
    });
    await hostProvider.forceFlush();
    await settled(() => recorder.spans.length);
    expect(recorder.spans.length > 2, "the processor exported too few spans");
    for (const span of recorder.spans) {
      const who = String(span.name);
      expect(span.attributes["user.id"] === "u-host", `${who} user.id`);
      expect(span.attributes["session.id"] === "s-host", `${who} session.id`);
      expect(
        String(span.attributes["langfuse.trace.tags"]) === "t-host",
        `${who} tags`,
      );
      expect(
        span.attributes["langfuse.trace.metadata.feature"] === "host",
        `${who} metadata`,
      );
    }
  },
);

// ---------------------------------------------------------------------------
// X06: the user's mask stays with the Langfuse exporter; a registry hands other exporters the span as it is
// ---------------------------------------------------------------------------

section("X06");

await check(
  "X06",
  "an exporter registered beside Langfuse receives the content as recorded, and the registry no longer carries a content policy",
  async () => {
    const registry = new dist.ExporterRegistry();
    const other = new RecordingExporter();
    await other.initialize();
    registry.register(other);
    expect(
      !("setContentPolicy" in registry) && !("getContentPolicy" in registry),
      "the registry still carries a content policy",
    );
    const span: SpanData = {
      spanId: "00f067aa0ba902b7",
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      type: dist.SpanType.MODEL_GENERATION,
      name: "generate",
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      durationMs: 1,
      status: dist.SpanStatus.OK,
      attributes: {
        "langfuse.observation.type": "generation",
        "langfuse.observation.input":
          '[{"role":"user","content":"SECRETWORD"}]',
        "langfuse.observation.output":
          '[{"role":"assistant","content":"SECRETWORD"}]',
      },
      events: [],
      links: [],
    };
    await registry.exportToAll(span);
    expect(other.spans.length === 1, "the exporter received no span");
    const received = JSON.stringify(other.spans[0].attributes);
    expect(received.includes("SECRETWORD"), "the content was changed");
  },
);

// ---------------------------------------------------------------------------
// X37: the realtime-turn trace and its once-on-retry guarantee
// ---------------------------------------------------------------------------

section("X37");

await check(
  "X37",
  "the realtime suite proves a retried turn write is traced once",
  async () => {
    const suite = await run(
      "pnpm",
      [
        "exec",
        "tsx",
        "test/continuous-test-suite-observability-proxy-voice.ts",
      ],
      {},
      240_000,
    );
    const line = suite.stdout
      .split("\n")
      .find((entry) =>
        /PROOF K19 \w+ realtime: a turn whose write is retried is traced once/.test(
          entry,
        ),
      );
    expect(line !== undefined, "the retried-turn check did not run");
    expect(/ PASS /.test(line as string), "the retried-turn check failed");
  },
);

await fake.close();
await hostProvider.shutdown();
console.log(
  failures === 0 ? "# all checks passed" : `# ${failures} check(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
