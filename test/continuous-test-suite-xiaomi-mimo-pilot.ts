#!/usr/bin/env tsx
/**
 * Xiaomi MiMo's bounded text/stream pilot through the public built SDK and CLI.
 * The owned endpoint validates the actual default/pinned model, route,
 * Bearer credential, unique prompt, output budget, stream mode and absence
 * of tool fields before it returns an answer or a model rejection.
 * Public MODEL_CONFIG_URL uses the same owned listener with a valid empty
 * registry, preserving the provider's actual catalog default.
 * The vendor documents `MIMO_API_KEY` in its own examples; the catalog reads
 * `XIAOMI_MIMO_API_KEY` first and `MIMO_API_KEY` as a fallback, and the cases
 * below pin which key reaches the wire in each combination.
 * The endpoint enforces the vendor-documented `max_completion_tokens` and
 * refuses obsolete `max_tokens` and unverified `stream_options` for MiMo.
 * LongCat controls retain their ordinary max_tokens/stream usage contract.
 * No source runtime imports, vendor calls, account or billing proof.
 * --package-root selects an installed package without changing module graphs.
 */
import "./helpers/credentialFreeEnv.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { defineSuite, runCommand, tempDir } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

type PublicSDK = typeof import("../dist/index.js");
type KeyMode = "primary" | "fallback" | "both" | "none";
type PilotProvider = "xiaomi-mimo" | "longcat";
type ActiveCase = {
  prompt: string;
  answer: string;
  model: string;
  stream: boolean;
  explicitModel: boolean;
  bearer: string | undefined;
  provider: PilotProvider;
  budget: number;
};
type Observation = {
  path: string;
  method: string;
  model: unknown;
  authMatchesExpected: boolean;
  validBody: boolean;
  inputRecognized: boolean;
  validStreamMode: boolean;
  stream: boolean;
  maxTokens: unknown;
  obsoleteBudgetPresent: boolean;
  streamOptionsPresent: boolean;
  includeUsage: unknown;
  toolsPresent: boolean;
  toolChoicePresent: boolean;
  rejection?: "invalid-wire" | "invalid-model";
  responseStatus?: number;
  servedModel?: string;
};

const MODEL = "mimo-v2.6-flash";
const LONGCAT_MODEL = "LongCat-2.5-Preview";
const BAD_MODEL = "owned-xiaomi-mimo-invalid-model";
const PRIMARY_ENV = "XIAOMI_MIMO_API_KEY";
const FALLBACK_ENV = "MIMO_API_KEY";
const PRIMARY_KEY = "xiaomi-mimo-owned-primary-key";
const FALLBACK_KEY = "xiaomi-mimo-owned-fallback-key";
const args = process.argv.slice(2);
const packageIndex = args.indexOf("--package-root");
const suppliedRoot = packageIndex < 0 ? undefined : args[packageIndex + 1];
if (packageIndex >= 0) {
  assert.ok(suppliedRoot, "--package-root requires an installed package path");
}
const root = resolve(suppliedRoot ?? ".");
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
if (packageIndex < 0) {
  assertDistFresh({ entrypoints: ["dist/index.js", "dist/cli/index.js"] });
}
const publicSDK = (await import(
  pathToFileURL(join(root, "dist/index.js")).href
)) as PublicSDK;
const { test, runSuite } = defineSuite(
  "Xiaomi MiMo owned public text controls",
  {
    offline: true,
  },
);
let active: ActiveCase;
const observations: Observation[] = [];
const metadataObservations: Array<{ method: string; path: string }> = [];
const OWNED_MODEL_REGISTRY = {
  version: "xiaomi-mimo-owned-empty-registry-v1",
  lastUpdated: "2026-10-10T00:00:00.000Z",
  models: {},
  defaults: {},
  aliases: {},
};

/** Narrow untrusted wire JSON before reading its observed fields. */
function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
/** Read textual message content without accepting non-text prompt canaries. */
function textContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((part) => {
      const row = object(part);
      return row.type === "text" && typeof row.text === "string"
        ? row.text
        : "";
    })
    .join("");
}
/** Set synthetic MiMo key precedence and return the expected Bearer value. */
function setKeys(mode: KeyMode): string | undefined {
  delete process.env[PRIMARY_ENV];
  delete process.env[FALLBACK_ENV];
  if (mode === "primary" || mode === "both") {
    process.env[PRIMARY_ENV] = PRIMARY_KEY;
  }
  if (mode === "fallback" || mode === "both") {
    process.env[FALLBACK_ENV] = FALLBACK_KEY;
  }
  return mode === "none"
    ? undefined
    : mode === "fallback"
      ? FALLBACK_KEY
      : PRIMARY_KEY;
}
/** Reset observations and pin a unique prompt, model, budget and credential. */
function beginCase(
  stream: boolean,
  model?: string,
  keys: KeyMode = "primary",
  provider: PilotProvider = "xiaomi-mimo",
  budget = 32,
): void {
  observations.length = 0;
  active = {
    prompt: `OWNED_PROMPT_${randomUUID()}`,
    answer: `OWNED_ANSWER_${randomUUID()}`,
    model: model ?? (provider === "xiaomi-mimo" ? MODEL : LONGCAT_MODEL),
    explicitModel: model !== undefined,
    stream,
    bearer: setKeys(keys),
    provider,
    budget,
  };
  if (provider === "longcat") {
    process.env.LONGCAT_API_KEY = "longcat-owned-control-key";
    active.bearer = process.env.LONGCAT_API_KEY;
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "HEAD" && req.url === "/health") {
    metadataObservations.push({ method: req.method, path: req.url });
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.method === "GET" && req.url === "/api/v1/models") {
    metadataObservations.push({ method: req.method, path: req.url });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(OWNED_MODEL_REGISTRY));
    return;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  let body: Record<string, unknown> = {};
  let validBody = false;
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString());
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      body = object(parsed);
      validBody = true;
    }
  } catch {
    // A malformed request never receives the case's answer.
  }
  const messages = Array.isArray(body.messages)
    ? body.messages.map(object)
    : [];
  const row: Observation = {
    path: req.url ?? "",
    method: req.method ?? "",
    model: body.model,
    authMatchesExpected:
      active.bearer !== undefined &&
      req.headers.authorization === `Bearer ${active.bearer}`,
    validBody,
    inputRecognized: messages.some(
      (message) =>
        message.role === "user" &&
        textContent(message.content).includes(active.prompt),
    ),
    validStreamMode: active.stream
      ? body.stream === true
      : body.stream === false || body.stream === undefined,
    stream: body.stream === true,
    maxTokens:
      active.provider === "xiaomi-mimo"
        ? body.max_completion_tokens
        : body.max_tokens,
    obsoleteBudgetPresent: Object.hasOwn(
      body,
      active.provider === "xiaomi-mimo"
        ? "max_tokens"
        : "max_completion_tokens",
    ),
    streamOptionsPresent: Object.hasOwn(body, "stream_options"),
    includeUsage: object(body.stream_options).include_usage,
    toolsPresent: Object.hasOwn(body, "tools"),
    toolChoicePresent: Object.hasOwn(body, "tool_choice"),
  };
  observations.push(row);
  const reject = (
    kind: Observation["rejection"],
    status: number,
    code: string,
    message: string,
  ): void => {
    row.rejection = kind;
    row.responseStatus = status;
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: { message, code, type: "invalid_request_error" },
      }),
    );
  };
  if (
    !validBody ||
    row.method !== "POST" ||
    row.path !==
      (active.provider === "xiaomi-mimo"
        ? "/v1/chat/completions"
        : "/openai/v1/chat/completions") ||
    !row.authMatchesExpected ||
    !row.inputRecognized ||
    !row.validStreamMode ||
    row.maxTokens !== active.budget ||
    row.obsoleteBudgetPresent ||
    (active.provider === "xiaomi-mimo" && row.streamOptionsPresent) ||
    (active.provider === "longcat" &&
      active.stream &&
      row.includeUsage !== true) ||
    row.toolsPresent ||
    row.toolChoicePresent
  ) {
    reject(
      "invalid-wire",
      400,
      "owned_invalid_wire",
      "Owned wire precondition failed",
    );
    return;
  }
  const servedModel = active.provider === "xiaomi-mimo" ? MODEL : LONGCAT_MODEL;
  if (body.model !== servedModel) {
    reject("invalid-model", 400, "owned_invalid_model", "Unsupported model");
    return;
  }
  row.responseStatus = 200;
  row.servedModel = servedModel;
  if (active.stream) {
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    for (const [delta, finish] of [
      [{ role: "assistant", content: active.answer }, null],
      [{}, "stop"],
    ] as const) {
      res.write(
        `data: ${JSON.stringify({
          id: "xiaomi-mimo-owned-stream",
          object: "chat.completion.chunk",
          created: 0,
          model: servedModel,
          choices: [{ index: 0, delta, finish_reason: finish }],
        })}\n\n`,
      );
    }
    res.end("data: [DONE]\n\n");
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: "xiaomi-mimo-owned-generate",
        object: "chat.completion",
        created: 0,
        model: servedModel,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: active.answer },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    );
  }
});
await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
const address = server.address();
assert.ok(address && typeof address === "object", "Owned listener missing");
process.env.MODEL_CONFIG_URL = `http://127.0.0.1:${address.port}/api/v1/models`;
process.env.XIAOMI_MIMO_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
process.env.LONGCAT_BASE_URL = `http://127.0.0.1:${address.port}/openai/v1`;

/** Require the owned metadata initialization pair or no metadata traffic. */
function assertMetadataWire(
  prior: number,
  expectInitialization: boolean,
): void {
  assert.deepEqual(
    metadataObservations.slice(prior),
    expectInitialization
      ? [
          { method: "HEAD", path: "/health" },
          { method: "GET", path: "/api/v1/models" },
        ]
      : [],
    "Metadata did not use the expected owned health and registry routes",
  );
}
/** Validate every request and refusal against the active provider contract. */
function assertWire(expectReply: boolean): void {
  assert.ok(observations.length > 0, "Owned endpoint was not reached");
  for (const row of observations) {
    assert.equal(
      row.path,
      active.provider === "xiaomi-mimo"
        ? "/v1/chat/completions"
        : "/openai/v1/chat/completions",
      "Chat route changed",
    );
    assert.equal(row.method, "POST", "Request method changed");
    assert.equal(row.authMatchesExpected, true, "Bearer mapping changed");
    assert.equal(row.validBody, true, "JSON request was malformed");
    assert.equal(row.model, active.model, "Model changed or fell back");
    assert.equal(row.inputRecognized, true, "Unique user prompt was dropped");
    assert.equal(row.validStreamMode, true, "Wire stream mode is invalid");
    assert.equal(row.stream, active.stream, "Wire stream mode changed");
    assert.equal(
      row.maxTokens,
      active.budget,
      "Explicit output budget was dropped",
    );
    assert.equal(
      row.obsoleteBudgetPresent,
      false,
      "Obsolete output field was sent",
    );
    assert.equal(
      row.streamOptionsPresent,
      active.provider === "longcat" && active.stream,
      "Profile-scoped stream options changed",
    );
    assert.equal(row.toolsPresent, false, "Tool-free request emitted tools");
    assert.equal(
      row.toolChoicePresent,
      false,
      "Tool-free request emitted tool choice",
    );
    assert.equal(
      row.rejection,
      expectReply ? undefined : "invalid-model",
      "Case rejected for the wrong reason",
    );
    assert.equal(row.responseStatus, expectReply ? 200 : 400);
    assert.equal(row.servedModel, expectReply ? active.model : undefined);
  }
}
/** Drive the built public SDK, checking metadata and always closing its client. */
async function sdkCall(kind: "generate" | "stream"): Promise<string> {
  const metadataBefore = metadataObservations.length;
  const expectMetadataInitialization =
    !active.explicitModel && metadataBefore === 0;
  let sdkSucceeded = false;
  const client = new publicSDK.NeuroLink({
    conversationMemory: { enabled: false },
  });
  try {
    const options = {
      provider: active.provider,
      ...(active.explicitModel ? { model: active.model } : {}),
      input: { text: active.prompt },
      maxTokens: active.budget,
      disableTools: true,
      disableInternalFallback: true,
    };
    if (kind === "generate") {
      const result = await client.generate(options);
      sdkSucceeded = true;
      return result.content;
    }
    const result = await client.stream(options);
    let text = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
    }
    sdkSucceeded = true;
    return text;
  } finally {
    await client.shutdown();
    if (sdkSucceeded) {
      assertMetadataWire(metadataBefore, expectMetadataInitialization);
    }
  }
}
/** Run the built or installed CLI with an isolated home and 60-second limit. */
async function cliCall(kind: "generate" | "stream") {
  const home = tempDir("xiaomi-mimo-owned-cli-");
  const metadataBefore = metadataObservations.length;
  const result = await runCommand(
    "node",
    [
      join(root, "dist/cli/index.js"),
      kind,
      active.prompt,
      "--provider",
      active.provider,
      ...(active.explicitModel ? ["--model", active.model] : []),
      "--disableTools",
      "--disable-internal-fallback",
      "--quiet",
      "--maxTokens",
      String(active.budget),
      ...(kind === "generate" && !active.explicitModel
        ? ["--format", "json"]
        : []),
    ],
    { cwd: home, env: { ...process.env, HOME: home }, timeoutMs: 60_000 },
  );
  assertMetadataWire(metadataBefore, !active.explicitModel);
  return result;
}
/** Require a fresh answer and the unchanged requested contract on either API. */
async function defaultCase(
  surface: "sdk" | "cli",
  kind: "generate" | "stream",
  keys: KeyMode,
  budget = 32,
  provider: PilotProvider = "xiaomi-mimo",
): Promise<void> {
  beginCase(kind === "stream", undefined, keys, provider, budget);
  let output: string;
  if (surface === "sdk") {
    output = await sdkCall(kind);
  } else {
    const result = await cliCall(kind);
    assert.equal(result.exitCode, 0, "Built CLI default case failed");
    output =
      kind === "generate"
        ? (JSON.parse(result.stdout) as { content: string }).content
        : result.stdout.trim();
  }
  assert.equal(output, active.answer, "Backend answer did not reach caller");
  assertWire(true);
}

try {
  for (const kind of ["generate", "stream"] as const) {
    for (const surface of ["sdk", "cli"] as const) {
      await test(`${surface}.${kind} uses actual catalog default and owned wire`, async () => {
        await defaultCase(surface, kind, "primary");
      });
      await test(`${surface}.${kind} rejects pinned ${BAD_MODEL} after valid wire`, async () => {
        beginCase(kind === "stream", BAD_MODEL);
        let rejected = false;
        if (surface === "sdk") {
          try {
            await sdkCall(kind);
          } catch {
            rejected = true;
          }
        } else {
          const result = await cliCall(kind);
          rejected = result.exitCode !== 0;
        }
        assert.equal(rejected, true, "Rejected pinned model succeeded");
        assertWire(false);
      });
    }
  }
  await test("sdk.generate reads the vendor-documented MIMO_API_KEY when it is the only key", async () => {
    await defaultCase("sdk", "generate", "fallback");
  });
  await test("cli.generate reads the vendor-documented MIMO_API_KEY when it is the only key", async () => {
    await defaultCase("cli", "generate", "fallback");
  });
  await test("sdk.generate prefers XIAOMI_MIMO_API_KEY over MIMO_API_KEY when both are set", async () => {
    await defaultCase("sdk", "generate", "both");
  });
  await test("sdk.generate without any key refuses before the wire and names XIAOMI_MIMO_API_KEY", async () => {
    beginCase(false, undefined, "none");
    let diagnostic: string | undefined;
    try {
      await sdkCall("generate");
    } catch (error) {
      diagnostic = error instanceof Error ? error.message : String(error);
    }
    assert.notEqual(diagnostic, undefined, "Keyless call succeeded");
    assert.equal(observations.length, 0, "Keyless call reached the endpoint");
    assert.ok(
      diagnostic?.includes(PRIMARY_ENV),
      "Keyless diagnostic does not name the catalog key variable",
    );
  });
  for (const budget of [7, 64]) {
    for (const kind of ["generate", "stream"] as const) {
      for (const surface of ["sdk", "cli"] as const) {
        await test(`${surface}.${kind} carries MiMo's documented output budget ${budget}`, async () => {
          await defaultCase(surface, kind, "primary", budget);
        });
      }
    }
  }
  for (const kind of ["generate", "stream"] as const) {
    for (const surface of ["sdk", "cli"] as const) {
      await test(`${surface}.${kind} keeps LongCat's ordinary budget and stream options`, async () => {
        await defaultCase(surface, kind, "primary", 32, "longcat");
      });
    }
  }
  for (const obsolete of ["max_tokens", "stream_options"] as const) {
    await test(`fixture calibration refuses MiMo ${obsolete} before an answer`, async () => {
      beginCase(obsolete === "stream_options");
      const body = {
        model: MODEL,
        messages: [{ role: "user", content: active.prompt }],
        stream: active.stream,
        ...(obsolete === "max_tokens"
          ? { max_completion_tokens: 32, max_tokens: 32 }
          : {
              max_completion_tokens: 32,
              stream_options: { include_usage: true },
            }),
      };
      const response = await fetch(
        `${process.env.XIAOMI_MIMO_BASE_URL}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${active.bearer}`,
          },
          body: JSON.stringify(body),
        },
      );
      assert.equal(response.status, 400, "Obsolete wire reached an answer");
      const result: unknown = await response.json();
      assert.equal(object(object(result).error).code, "owned_invalid_wire");
      assert.equal(
        observations.length,
        1,
        "Fixture calibration must send one request",
      );
      assert.equal(observations[0].rejection, "invalid-wire");
      assert.equal(observations[0].servedModel, undefined);
    });
  }
} finally {
  await new Promise<void>((closed, reject) => {
    server.close((error) => (error ? reject(error) : closed()));
  });
}
await runSuite();
