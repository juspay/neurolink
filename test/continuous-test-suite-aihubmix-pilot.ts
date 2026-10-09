#!/usr/bin/env tsx
/**
 * AIHubMix's bounded text/stream pilot through the public built SDK and CLI.
 * The owned endpoint validates the actual default/pinned model, route,
 * Bearer credential, unique prompt, output budget, stream mode and absence
 * of tool fields before it returns an answer or a model rejection.
 * Public MODEL_CONFIG_URL uses the same owned listener with a valid empty
 * registry, preserving the provider's actual catalog default.
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
type ActiveCase = {
  prompt: string;
  answer: string;
  model: string;
  stream: boolean;
  explicitModel: boolean;
};
type Observation = {
  path: string;
  method: string;
  model: unknown;
  authMatchesFixture: boolean;
  validBody: boolean;
  inputRecognized: boolean;
  validStreamMode: boolean;
  stream: boolean;
  maxTokens: unknown;
  toolsPresent: boolean;
  toolChoicePresent: boolean;
  rejection?: "invalid-wire" | "invalid-model" | "retired-model";
  responseStatus?: number;
  servedModel?: string;
};

const MODEL = "gpt-4o-mini";
const BAD_MODEL = "owned-aihubmix-invalid-model";
const RETIRED_MODELS = ["gpt-4o-free", "gpt-5.5-free"] as const;
const FIXTURE_KEY = "aihubmix-owned-fixture-key";
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
delete process.env.AIHUBMIX_MODEL;
if (packageIndex < 0) {
  assertDistFresh({ entrypoints: ["dist/index.js", "dist/cli/index.js"] });
}
const publicSDK = (await import(
  pathToFileURL(join(root, "dist/index.js")).href
)) as PublicSDK;
const { test, runSuite } = defineSuite("AIHubMix owned public text controls", {
  offline: true,
});
let active: ActiveCase;
const observations: Observation[] = [];
const metadataObservations: Array<{ method: string; path: string }> = [];
const OWNED_MODEL_REGISTRY = {
  version: "aihubmix-owned-empty-registry-v1",
  lastUpdated: "2026-10-09T00:00:00.000Z",
  models: {},
  defaults: {},
  aliases: {},
};

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
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
function beginCase(stream: boolean, model?: string): void {
  observations.length = 0;
  active = {
    prompt: `OWNED_PROMPT_${randomUUID()}`,
    answer: `OWNED_ANSWER_${randomUUID()}`,
    model: model ?? MODEL,
    explicitModel: model !== undefined,
    stream,
  };
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
    authMatchesFixture: req.headers.authorization === `Bearer ${FIXTURE_KEY}`,
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
    maxTokens: body.max_tokens,
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
        error: {
          message,
          code,
          type:
            kind === "retired-model"
              ? "Aihubmix_api_error"
              : "invalid_request_error",
        },
      }),
    );
  };
  if (
    !validBody ||
    row.method !== "POST" ||
    row.path !== "/v1/chat/completions" ||
    !row.authMatchesFixture ||
    !row.inputRecognized ||
    !row.validStreamMode ||
    row.maxTokens !== 32 ||
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
  if (RETIRED_MODELS.some((model) => model === body.model)) {
    reject(
      "retired-model",
      404,
      "model_retired",
      "The requested AIHubMix model is retired",
    );
    return;
  }
  if (body.model !== MODEL) {
    reject("invalid-model", 400, "owned_invalid_model", "Unsupported model");
    return;
  }
  row.responseStatus = 200;
  row.servedModel = MODEL;
  if (active.stream) {
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    for (const [delta, finish] of [
      [{ role: "assistant", content: active.answer }, null],
      [{}, "stop"],
    ] as const) {
      res.write(
        `data: ${JSON.stringify({
          id: "aihubmix-owned-stream",
          object: "chat.completion.chunk",
          created: 0,
          model: MODEL,
          choices: [{ index: 0, delta, finish_reason: finish }],
        })}\n\n`,
      );
    }
    res.end("data: [DONE]\n\n");
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: "aihubmix-owned-generate",
        object: "chat.completion",
        created: 0,
        model: MODEL,
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
process.env.AIHUBMIX_API_KEY = FIXTURE_KEY;
process.env.AIHUBMIX_BASE_URL = `http://127.0.0.1:${address.port}/v1`;

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
function assertWire(expectReply: boolean): void {
  assert.ok(observations.length > 0, "Owned endpoint was not reached");
  const retired = RETIRED_MODELS.some((model) => model === active.model);
  for (const row of observations) {
    assert.equal(row.path, "/v1/chat/completions", "Chat route changed");
    assert.equal(row.method, "POST", "Request method changed");
    assert.equal(row.authMatchesFixture, true, "Bearer mapping changed");
    assert.equal(row.validBody, true, "JSON request was malformed");
    assert.equal(row.model, active.model, "Model changed or fell back");
    assert.equal(row.inputRecognized, true, "Unique user prompt was dropped");
    assert.equal(row.validStreamMode, true, "Wire stream mode is invalid");
    assert.equal(row.stream, active.stream, "Wire stream mode changed");
    assert.equal(row.maxTokens, 32, "Explicit output budget was dropped");
    assert.equal(row.toolsPresent, false, "Tool-free request emitted tools");
    assert.equal(
      row.toolChoicePresent,
      false,
      "Tool-free request emitted tool choice",
    );
    assert.equal(
      row.rejection,
      expectReply ? undefined : retired ? "retired-model" : "invalid-model",
      "Case rejected for the wrong reason",
    );
    assert.equal(row.responseStatus, expectReply ? 200 : retired ? 404 : 400);
    assert.equal(row.servedModel, expectReply ? MODEL : undefined);
  }
}
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
      provider: "aihubmix",
      ...(active.explicitModel ? { model: active.model } : {}),
      input: { text: active.prompt },
      maxTokens: 32,
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
async function cliCall(kind: "generate" | "stream") {
  const home = tempDir("aihubmix-owned-cli-");
  const metadataBefore = metadataObservations.length;
  const result = await runCommand(
    "node",
    [
      join(root, "dist/cli/index.js"),
      kind,
      active.prompt,
      "--provider",
      "aihubmix",
      ...(active.explicitModel ? ["--model", active.model] : []),
      "--disableTools",
      "--disable-internal-fallback",
      "--quiet",
      "--maxTokens",
      "32",
      ...(kind === "generate" && !active.explicitModel
        ? ["--format", "json"]
        : []),
    ],
    { cwd: home, env: { ...process.env, HOME: home }, timeoutMs: 60_000 },
  );
  assertMetadataWire(metadataBefore, !active.explicitModel);
  return result;
}

try {
  for (const kind of ["generate", "stream"] as const) {
    for (const surface of ["sdk", "cli"] as const) {
      await test(`${surface}.${kind} uses actual catalog default and owned wire`, async () => {
        beginCase(kind === "stream");
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
        assert.equal(
          output,
          active.answer,
          "Backend answer did not reach caller",
        );
        assertWire(true);
      });
      for (const model of [BAD_MODEL, ...RETIRED_MODELS]) {
        await test(`${surface}.${kind} rejects pinned ${model} after valid wire`, async () => {
          beginCase(kind === "stream", model);
          let rejected = false;
          let diagnostic = "";
          if (surface === "sdk") {
            try {
              await sdkCall(kind);
            } catch (error) {
              rejected = true;
              diagnostic =
                error instanceof Error ? error.message : String(error);
            }
          } else {
            const result = await cliCall(kind);
            rejected = result.exitCode !== 0;
            diagnostic = result.stderr;
          }
          assert.equal(rejected, true, "Rejected pinned model succeeded");
          assertWire(false);
          if (RETIRED_MODELS.some((retired) => retired === model)) {
            assert.match(diagnostic, /retired/i, "Retirement cause was lost");
          }
        });
      }
    }
  }
} finally {
  await new Promise<void>((closed, reject) => {
    server.close((error) => (error ? reject(error) : closed()));
  });
}
await runSuite();
