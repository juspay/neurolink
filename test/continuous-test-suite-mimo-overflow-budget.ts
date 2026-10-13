#!/usr/bin/env tsx
/**
 * Exercise overflow recovery through the built public SDK and CLI, not an
 * internal refit helper. An owned transport accepts the initial request only
 * after checking its model/auth/prompt/stream/budget contract, returns a finite
 * overflow, then accepts at most one correctly shaped, smaller-budget retry.
 *
 * Both error dialects are covered: input and requested output reported
 * separately, and input counts without a reported output. A third control
 * deliberately reports an output budget larger than the caller sent; recovery
 * must never adopt that larger budget or invent a retry that raises the cap.
 * LongCat keeps the ordinary max_tokens field, including its stream options.
 * No vendor/account calls, source runtime imports, or new declarations.
 */
import "./helpers/credentialFreeEnv.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { defineSuite, runCommand, tempDir } from "./helpers/harness.js";

type PublicSDK = typeof import("../dist/index.js");
type Provider = "xiaomi-mimo" | "longcat";
type Mode = "reported-output" | "input-only" | "do-not-increase";
type Kind = "generate" | "stream";
type Wire = {
  path: string;
  model: unknown;
  budget: unknown;
  legacyBudget: unknown;
  completionBudget: unknown;
  otherBudgetPresent: boolean;
  streamOptionsPresent: boolean;
  stream: boolean;
  method: string;
  promptPresent: boolean;
  authValid: boolean;
  response: "overflow" | "answer" | "invalid-wire" | "unexpected-retry";
};
type Case = {
  provider: Provider;
  mode: Mode;
  kind: Kind;
  model: string;
  prompt: string;
  answer: string;
  callerBudget: number;
  records: Wire[];
};

const WINDOW = 8192;
const INPUT = 7000;
// Existing legacy recovery keeps a 512-token framing margin. Characterize the
// same public wire result rather than importing that implementation constant.
const REFIT = 680;
const MODELS = {
  "xiaomi-mimo": "mimo-v2.6-flash",
  longcat: "LongCat-2.5-Preview",
};
const KEY = "owned-overflow-no-real-key";
const argv = process.argv.slice(2);
const packageIndex = argv.indexOf("--package-root");
const packageRoot = packageIndex < 0 ? undefined : argv[packageIndex + 1];
if (packageIndex >= 0) {
  assert.ok(packageRoot, "--package-root requires an installed package path");
}
const root = resolve(packageRoot ?? ".");
if (packageIndex < 0) {
  assertDistFresh({ entrypoints: ["dist/index.js", "dist/cli/index.js"] });
}
for (const name of [
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "http_proxy",
  "https_proxy",
  "all_proxy",
]) {
  delete process.env[name];
}
process.env.NO_PROXY = "127.0.0.1,localhost";
process.env.no_proxy = "127.0.0.1,localhost";
process.env.NEUROLINK_SKIP_MCP = "true";
delete process.env.XIAOMI_MIMO_MODEL;
delete process.env.LONGCAT_MODEL;
process.env.XIAOMI_MIMO_API_KEY = KEY;
process.env.LONGCAT_API_KEY = KEY;
let active: Case;
const metadata: Array<{ method: string; path: string }> = [];

/** Narrow untrusted JSON to the wire object's own record shape. */
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Read only textual user content; images cannot satisfy the prompt canary. */
function text(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (!Array.isArray(value)) {
    return "";
  }
  return value
    .map((part) => {
      const p = record(part);
      return p.type === "text" && typeof p.text === "string" ? p.text : "";
    })
    .join("");
}

/** Pin one finite case and discard observations from its predecessor. */
function begin(provider: Provider, kind: Kind, mode: Mode): void {
  active = {
    provider,
    kind,
    mode,
    model: MODELS[provider],
    prompt: `OWNED_OVERFLOW_PROMPT_${randomUUID()}`,
    answer: `OWNED_OVERFLOW_ANSWER_${randomUUID()}`,
    callerBudget: mode === "do-not-increase" ? 32 : 2048,
    records: [],
  };
}

/** Serve only owned metadata and strictly validated finite inference requests. */
const server = createServer(async (req, res) => {
  if (req.method === "HEAD" && req.url === "/health") {
    metadata.push({ method: req.method, path: req.url });
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.method === "GET" && req.url === "/api/v1/models") {
    metadata.push({ method: req.method, path: req.url });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        version: "owned-overflow-empty-models-v1",
        lastUpdated: "2026-10-14T00:00:00Z",
        models: {},
        defaults: {},
        aliases: {},
      }),
    );
    return;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  let body: Record<string, unknown> = {};
  try {
    body = record(JSON.parse(Buffer.concat(chunks).toString()));
  } catch {
    /* refuse below */
  }
  const modern = active.provider === "xiaomi-mimo";
  const messages = Array.isArray(body.messages)
    ? body.messages.map(record)
    : [];
  const observation: Wire = {
    path: req.url ?? "",
    method: req.method ?? "",
    model: body.model,
    budget: modern ? body.max_completion_tokens : body.max_tokens,
    legacyBudget: body.max_tokens,
    completionBudget: body.max_completion_tokens,
    otherBudgetPresent: Object.hasOwn(
      body,
      modern ? "max_tokens" : "max_completion_tokens",
    ),
    streamOptionsPresent: Object.hasOwn(body, "stream_options"),
    stream: body.stream === true,
    promptPresent: messages.some(
      (m) => m.role === "user" && text(m.content).includes(active.prompt),
    ),
    authValid: req.headers.authorization === `Bearer ${KEY}`,
    response: "invalid-wire",
  };
  active.records.push(observation);
  const index = active.records.length;
  const expectedBudget = index === 1 ? active.callerBudget : REFIT;
  const expectedPath = modern
    ? "/v1/chat/completions"
    : "/openai/v1/chat/completions";
  const error = (code: string, message: string): void => {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: { code, type: "invalid_request_error", message },
      }),
    );
  };
  if (
    observation.method !== "POST" ||
    observation.path !== expectedPath ||
    !observation.authValid ||
    observation.model !== active.model ||
    !observation.promptPresent ||
    observation.stream !== (active.kind === "stream") ||
    observation.otherBudgetPresent ||
    (modern && observation.streamOptionsPresent) ||
    (!modern &&
      active.kind === "stream" &&
      record(body.stream_options).include_usage !== true) ||
    observation.budget !== expectedBudget ||
    Object.hasOwn(body, "tools") ||
    Object.hasOwn(body, "tool_choice")
  ) {
    error("owned_invalid_wire", "Owned overflow wire contract failed");
    return;
  }
  if (index === 1) {
    observation.response = "overflow";
    const counts =
      active.mode === "input-only"
        ? `However, your messages resulted in ${INPUT} tokens.`
        : active.mode === "do-not-increase"
          ? "However, you requested 16384 output tokens and your prompt contains at least 1024 input tokens."
          : `However, you requested ${active.callerBudget} output tokens and your prompt contains at least ${INPUT} input tokens.`;
    error(
      "context_length_exceeded",
      `This model's maximum context length is ${WINDOW} tokens. ${counts}`,
    );
    return;
  }
  if (active.mode === "do-not-increase" || index !== 2) {
    observation.response = "unexpected-retry";
    error(
      "owned_unexpected_retry",
      "Owned fixture refuses extra or cap-increasing retry",
    );
    return;
  }
  observation.response = "answer";
  if (active.kind === "stream") {
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    for (const [delta, finish] of [
      [{ role: "assistant", content: active.answer }, null],
      [{}, "stop"],
    ] as const) {
      res.write(
        `data: ${JSON.stringify({
          id: "owned-overflow",
          object: "chat.completion.chunk",
          created: 0,
          model: active.model,
          choices: [{ index: 0, delta, finish_reason: finish }],
        })}\n\n`,
      );
    }
    res.end("data: [DONE]\n\n");
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: "owned-overflow",
        object: "chat.completion",
        created: 0,
        model: active.model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: active.answer },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: INPUT,
          completion_tokens: 1,
          total_tokens: INPUT + 1,
        },
      }),
    );
  }
});
await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
const address = server.address();
assert.ok(
  address && typeof address === "object",
  "Owned overflow listener missing",
);
process.env.MODEL_CONFIG_URL = `http://127.0.0.1:${address.port}/api/v1/models`;
process.env.XIAOMI_MIMO_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
process.env.LONGCAT_BASE_URL = `http://127.0.0.1:${address.port}/openai/v1`;
const { NeuroLink } = (await import(
  pathToFileURL(join(root, "dist/index.js")).href
)) as PublicSDK;
const { test, runSuite } = defineSuite(
  "Owned wire overflow budget preservation",
  { offline: true },
);

/** Run one real public SDK operation and always dispose its client. */
async function sdk(): Promise<string> {
  const client = new NeuroLink({ conversationMemory: { enabled: false } });
  try {
    const options = {
      provider: active.provider,
      input: { text: active.prompt },
      maxTokens: active.callerBudget,
      disableTools: true,
      disableInternalFallback: true,
    };
    if (active.kind === "generate") {
      return (await client.generate(options)).content;
    }
    const result = await client.stream(options);
    let answer = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        answer += chunk.content;
      }
    }
    return answer;
  } finally {
    await client.shutdown();
  }
}

/** Execute the built or installed CLI with the unchanged 60-second deadline. */
async function cli(): Promise<string> {
  const home = tempDir("owned-overflow-cli-");
  const result = await runCommand(
    "node",
    [
      join(root, "dist/cli/index.js"),
      active.kind,
      active.prompt,
      "--provider",
      active.provider,
      "--disableTools",
      "--disable-internal-fallback",
      "--quiet",
      "--maxTokens",
      String(active.callerBudget),
      ...(active.kind === "generate" ? ["--format", "json"] : []),
    ],
    { cwd: home, env: { ...process.env, HOME: home }, timeoutMs: 60_000 },
  );
  if (result.exitCode !== 0) {
    throw new Error(`Built CLI rejected request: ${result.stderr}`);
  }
  return active.kind === "generate"
    ? (JSON.parse(result.stdout) as { content: string }).content
    : result.stdout.trim();
}

/** Prove exactly one compatible reducing retry, or one unchanged-cap refusal. */
async function execute(surface: "sdk" | "cli"): Promise<void> {
  let answer: string | undefined;
  let rejected = false;
  try {
    answer = await (surface === "sdk" ? sdk() : cli());
  } catch {
    rejected = true;
  }
  const noRaise = active.mode === "do-not-increase";
  assert.equal(rejected, noRaise, "Caller outcome changed");
  assert.equal(
    answer,
    noRaise ? undefined : active.answer,
    "Backend answer changed",
  );
  assert.equal(
    active.records.length,
    noRaise ? 1 : 2,
    "Expected one attempt or one reducing retry",
  );
  for (const [i, row] of active.records.entries()) {
    assert.equal(row.model, active.model, "Model changed or fell back");
    assert.equal(row.authValid, true, "Retry lost Bearer authority");
    assert.equal(row.promptPresent, true, "Retry dropped unique user prompt");
    assert.equal(
      row.otherBudgetPresent,
      false,
      "Retry introduced an incompatible budget field",
    );
    assert.equal(
      row.budget,
      i === 0 ? active.callerBudget : REFIT,
      "Wrong output budget on the wire",
    );
    assert.ok(
      typeof row.budget === "number" && row.budget <= active.callerBudget,
      "Retry increased caller budget",
    );
    assert.equal(
      row.response,
      i === 0 ? "overflow" : "answer",
      "Fixture accepted or rejected for wrong reason",
    );
    assert.equal(
      row.streamOptionsPresent,
      active.provider === "longcat" && active.kind === "stream",
      "Stream options changed",
    );
  }
}

try {
  for (const provider of ["xiaomi-mimo", "longcat"] as const) {
    for (const mode of [
      "reported-output",
      "input-only",
      "do-not-increase",
    ] as const) {
      for (const kind of ["generate", "stream"] as const) {
        for (const surface of ["sdk", "cli"] as const) {
          await test(`${surface}.${kind} ${provider} ${mode} preserves its wire budget`, async () => {
            begin(provider, kind, mode);
            await execute(surface);
          });
        }
      }
    }
  }
  assert.ok(
    metadata.some((x) => x.method === "HEAD" && x.path === "/health"),
    "Owned metadata health was not used",
  );
  assert.ok(
    metadata.some((x) => x.method === "GET" && x.path === "/api/v1/models"),
    "Owned metadata registry was not used",
  );
} finally {
  await new Promise<void>((ready, reject) =>
    server.close((error) => (error ? reject(error) : ready())),
  );
}
await runSuite();
