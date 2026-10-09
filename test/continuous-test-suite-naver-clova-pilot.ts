#!/usr/bin/env tsx
/**
 * NAVER's source profile and required-tool-choice guard through public SDK
 * generate/stream and built CLI. The owned wire validates actual model,
 * prompt, route, Bearer auth, output budget and effective stream mode.
 * Tool cases execute a fresh nonce and require its return at the endpoint.
 * Dynamic metadata uses MODEL_CONFIG_URL and the same owned listener. Its
 * valid empty registry leaves unknown providers on their catalog defaults.
 * No runtime source imports, actual vendor calls, account or billing proof.
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
type Choice = "auto" | "none" | "named" | "required";
type Case = {
  provider: "naver-clova-studio" | "cerebras";
  stream: boolean;
  mode: "plain" | "tool";
  choice?: Choice;
  prompt: string;
  answer: string;
  callId: string;
  executedNonce?: string;
  executions: number;
};
type Observation = {
  path: string;
  model: unknown;
  authMatchesFixture: boolean;
  inputRecognized: boolean;
  validStreamMode: boolean;
  stream: boolean;
  maxTokens: unknown;
  toolChoice: unknown;
  offeredToolName?: string;
  toolNonce?: string;
  rejection?: "invalid-wire" | "invalid-model" | "invalid-choice";
  reply?: "plain" | "tool-call" | "tool-confirmation";
  servedModel?: string;
};

const NCP_MODEL = "HCX-005";
const CONTROL_MODEL = "gpt-oss-120b";
const BAD_MODEL = "owned-invalid-clova-model";
const FIXTURE_KEY = "pilot-fixture-env";
const TOOL_NAME = "naver_nonce_tool";
const GUARD_MESSAGE =
  "tool_choice='required' is not supported by this endpoint";
const args = process.argv.slice(2);
const packageIndex = args.indexOf("--package-root");
const root = resolve(packageIndex < 0 ? "." : args[packageIndex + 1]);
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
delete process.env.NAVER_CLOVA_STUDIO_MODEL;
delete process.env.CEREBRAS_MODEL;
if (packageIndex < 0) {
  assertDistFresh({ entrypoints: ["dist/index.js", "dist/cli/index.js"] });
}
const sdk = (await import(
  pathToFileURL(join(root, "dist/index.js")).href
)) as PublicSDK;
const { test, runSuite } = defineSuite("NAVER owned public controls", {
  offline: true,
});
let active: Case;
const observations: Observation[] = [];
const metadataObservations: Array<{ method: string; path: string }> = [];
const OWNED_MODEL_REGISTRY = {
  version: "naver-owned-empty-registry-v1",
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
function nonceFrom(value: unknown): string | undefined {
  if (typeof value === "string") {
    try {
      return nonceFrom(JSON.parse(value));
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const nonce = nonceFrom(item);
      if (nonce) {
        return nonce;
      }
    }
    return undefined;
  }
  const row = object(value);
  if (typeof row.nonce === "string") {
    return row.nonce;
  }
  for (const nested of Object.values(row)) {
    const nonce = nonceFrom(nested);
    if (nonce) {
      return nonce;
    }
  }
  return undefined;
}
function beginCase(
  stream: boolean,
  mode: Case["mode"] = "plain",
  choice?: Choice,
  provider: Case["provider"] = "naver-clova-studio",
): void {
  observations.length = 0;
  active = {
    provider,
    stream,
    mode,
    choice,
    prompt: `OWNED_PROMPT_${randomUUID()}`,
    answer: `OWNED_ANSWER_${randomUUID()}`,
    callId: `call_${randomUUID()}`,
    executions: 0,
  };
}
function expectedModel(): string {
  return active.provider === "cerebras" ? CONTROL_MODEL : NCP_MODEL;
}
function expectedPath(): string {
  return active.provider === "cerebras"
    ? "/v1/chat/completions"
    : "/v1/openai/chat/completions";
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
    /* malformed input never receives a golden answer */
  }
  const messages = Array.isArray(body.messages)
    ? body.messages.map(object)
    : [];
  const tools = Array.isArray(body.tools) ? body.tools.map(object) : [];
  const tool = tools.find((entry) => {
    const name = object(entry.function).name;
    return typeof name === "string" && name.includes(TOOL_NAME);
  });
  const wireName = object(tool?.function).name;
  const toolResult = messages.find(
    (message) =>
      message.role === "tool" && message.tool_call_id === active.callId,
  );
  const observation: Observation = {
    path: req.url ?? "",
    model: body.model,
    authMatchesFixture: req.headers.authorization === `Bearer ${FIXTURE_KEY}`,
    inputRecognized: messages.some(
      (message) =>
        message.role === "user" &&
        textContent(message.content).includes(active.prompt),
    ),
    stream: body.stream === true,
    validStreamMode: active.stream
      ? body.stream === true
      : body.stream === false || body.stream === undefined,
    maxTokens:
      active.provider === "cerebras"
        ? (body.max_completion_tokens ?? body.max_tokens)
        : body.max_tokens,
    toolChoice: body.tool_choice,
    ...(typeof wireName === "string" ? { offeredToolName: wireName } : {}),
    ...(toolResult ? { toolNonce: nonceFrom(toolResult.content) } : {}),
  };
  observations.push(observation);
  const reject = (kind: Observation["rejection"], message: string) => {
    observation.rejection = kind;
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: {
          message,
          type: "invalid_request_error",
          code: "owned_rejection",
        },
      }),
    );
  };
  if (
    !validBody ||
    req.method !== "POST" ||
    observation.path !== expectedPath() ||
    !observation.authMatchesFixture ||
    !observation.inputRecognized ||
    !observation.validStreamMode ||
    observation.maxTokens !== 32
  ) {
    reject("invalid-wire", "Owned wire precondition failed");
    return;
  }
  if (body.model !== expectedModel()) {
    reject("invalid-model", "Unsupported model");
    return;
  }
  const choice = body.tool_choice;
  const named = object(object(choice).function).name;
  if (
    active.provider === "naver-clova-studio" &&
    choice === "required" &&
    tools.length > 0
  ) {
    reject("invalid-choice", "Required choice is unsupported");
    return;
  }
  if (active.mode === "plain") {
    if (Object.hasOwn(body, "tools") || Object.hasOwn(body, "tool_choice")) {
      reject("invalid-wire", "Tool-free request carried tool fields");
      return;
    }
  } else if (!toolResult) {
    const validChoice =
      active.choice === "none"
        ? (tools.length === 0 && choice === undefined) || choice === "none"
        : active.choice === "auto"
          ? tools.length > 0 && (choice === "auto" || choice === undefined)
          : active.choice === "named"
            ? typeof wireName === "string" && named === wireName
            : choice === "required";
    if (
      !validChoice ||
      (active.choice !== "none" && typeof wireName !== "string")
    ) {
      reject("invalid-choice", "Requested tool intent was not preserved");
      return;
    }
  } else if (
    !active.executedNonce ||
    observation.toolNonce !== active.executedNonce
  ) {
    reject("invalid-wire", "Executed nonce did not return at endpoint");
    return;
  }
  const responseModel =
    active.provider === "cerebras" ? CONTROL_MODEL : NCP_MODEL;
  const toolCall =
    active.mode === "tool" && active.choice !== "none" && !toolResult;
  observation.reply = toolCall
    ? "tool-call"
    : toolResult
      ? "tool-confirmation"
      : "plain";
  observation.servedModel = responseModel;
  if (active.stream) {
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    const parts = toolCall
      ? [
          [
            {
              role: "assistant",
              tool_calls: [
                {
                  index: 0,
                  id: active.callId,
                  type: "function",
                  function: { name: wireName, arguments: "{" },
                },
              ],
            },
            null,
          ],
          [{ tool_calls: [{ index: 0, function: { arguments: "}" } }] }, null],
          [{}, "tool_calls"],
        ]
      : [
          [{ role: "assistant", content: active.answer }, null],
          [{}, "stop"],
        ];
    for (const [delta, finish] of parts) {
      res.write(
        `data: ${JSON.stringify({
          id: "owned-stream",
          object: "chat.completion.chunk",
          created: 0,
          model: responseModel,
          choices: [{ index: 0, delta, finish_reason: finish }],
        })}\n\n`,
      );
    }
    res.end("data: [DONE]\n\n");
  } else {
    const message = toolCall
      ? {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: active.callId,
              type: "function",
              function: { name: wireName, arguments: "{}" },
            },
          ],
        }
      : { role: "assistant", content: active.answer };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: "owned-generate",
        object: "chat.completion",
        created: 0,
        model: responseModel,
        choices: [
          {
            index: 0,
            message,
            finish_reason: toolCall ? "tool_calls" : "stop",
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    );
  }
});
await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
const address = server.address();
assert.ok(address && typeof address === "object", "Owned endpoint missing");
process.env.MODEL_CONFIG_URL = `http://127.0.0.1:${address.port}/api/v1/models`;
process.env.NAVER_CLOVA_STUDIO_API_KEY = FIXTURE_KEY;
process.env.NAVER_CLOVA_STUDIO_BASE_URL = `http://127.0.0.1:${address.port}/v1/openai`;
process.env.CEREBRAS_API_KEY = FIXTURE_KEY;
process.env.CEREBRAS_BASE_URL = `http://127.0.0.1:${address.port}/v1`;

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
    "Dynamic metadata did not use the expected owned health and registry routes",
  );
}

function assertWire(model: string, expectReply: boolean): void {
  assert.ok(observations.length > 0, "Owned endpoint was not reached");
  for (const row of observations) {
    assert.equal(row.path, expectedPath(), "Chat route changed");
    assert.equal(row.authMatchesFixture, true, "Bearer mapping changed");
    assert.equal(row.model, model, "Model changed or fell back");
    assert.equal(row.inputRecognized, true, "Unique user prompt was dropped");
    assert.equal(row.validStreamMode, true, "Wire mode is invalid");
    assert.equal(row.stream, active.stream, "Wire mode changed");
    assert.equal(row.maxTokens, 32, "Output budget was dropped");
    assert.equal(
      row.rejection,
      expectReply ? undefined : "invalid-model",
      "Wrong response/rejection cause",
    );
  }
  if (expectReply) {
    assert.ok(
      observations.some((row) => row.servedModel === expectedModel()),
      "Backend did not emit a response",
    );
  }
}
async function sdkCall(
  kind: "generate" | "stream",
  invalid = false,
  offerTools = false,
): Promise<string> {
  const metadataBefore = metadataObservations.length;
  const expectMetadataInitialization =
    !invalid &&
    active.provider === "naver-clova-studio" &&
    metadataBefore === 0;
  const client = new sdk.NeuroLink({ conversationMemory: { enabled: false } });
  try {
    const tools = offerTools
      ? {
          [TOOL_NAME]: {
            description: "Return a fresh execution nonce",
            inputSchema: sdk.jsonSchema<Record<string, never>>({
              type: "object",
              properties: {},
              additionalProperties: false,
            }),
            execute: async () => {
              active.executions++;
              active.executedNonce = randomUUID();
              return { nonce: active.executedNonce };
            },
          },
        }
      : undefined;
    const toolChoice =
      active.choice === "named"
        ? { type: "tool" as const, toolName: TOOL_NAME }
        : active.choice;
    const options = {
      provider: active.provider,
      ...(active.provider === "cerebras" ? { model: CONTROL_MODEL } : {}),
      ...(invalid ? { model: BAD_MODEL } : {}),
      input: { text: active.prompt },
      maxTokens: 32,
      disableTools: !offerTools,
      disableInternalFallback: true,
      ...(tools ? { tools } : {}),
      ...(toolChoice ? { toolChoice } : {}),
    };
    if (kind === "generate") {
      return (await client.generate(options)).content;
    }
    const result = await client.stream(options);
    let text = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
    }
    return text;
  } finally {
    await client.shutdown();
    assertMetadataWire(metadataBefore, expectMetadataInitialization);
  }
}
async function cliCall(kind: "generate" | "stream", invalid = false) {
  const home = tempDir("naver-owned-cli-");
  const metadataBefore = metadataObservations.length;
  const result = await runCommand(
    "node",
    [
      join(root, "dist/cli/index.js"),
      kind,
      active.prompt,
      "--provider",
      "naver-clova-studio",
      ...(invalid ? ["--model", BAD_MODEL] : []),
      "--disableTools",
      "--disable-internal-fallback",
      "--quiet",
      "--maxTokens",
      "32",
      ...(kind === "generate" && !invalid ? ["--format", "json"] : []),
    ],
    { cwd: home, env: { ...process.env, HOME: home }, timeoutMs: 60_000 },
  );
  assertMetadataWire(metadataBefore, !invalid);
  return result;
}

try {
  for (const kind of ["generate", "stream"] as const) {
    for (const surface of ["sdk", "cli"] as const) {
      await test(`${surface}.${kind} validates catalog default and actual wire`, async () => {
        beginCase(kind === "stream");
        let text: string;
        if (surface === "sdk") {
          try {
            text = await sdkCall(kind);
          } catch {
            throw new Error("Owned public SDK case did not complete");
          }
        } else {
          const result = await cliCall(kind);
          assert.equal(result.exitCode, 0, "Built CLI case failed");
          text =
            kind === "generate"
              ? (JSON.parse(result.stdout) as { content: string }).content
              : result.stdout.trim();
        }
        assert.equal(
          text,
          active.answer,
          "Backend output did not reach caller",
        );
        assertWire(NCP_MODEL, true);
      });
      await test(`${surface}.${kind} rejects invalid model after wire preconditions`, async () => {
        beginCase(kind === "stream");
        let rejected = false;
        if (surface === "sdk") {
          try {
            await sdkCall(kind, true);
          } catch {
            rejected = true;
          }
        } else {
          rejected = (await cliCall(kind, true)).exitCode !== 0;
        }
        assert.equal(rejected, true, "Invalid pinned model succeeded");
        assertWire(BAD_MODEL, false);
      });
    }
    for (const choice of ["auto", "none", "named"] as const) {
      await test(`sdk.${kind} preserves ${choice} tool intent`, async () => {
        beginCase(kind === "stream", "tool", choice);
        let text: string;
        try {
          text = await sdkCall(kind, false, true);
        } catch {
          throw new Error("Owned accepted tool case did not complete");
        }
        assert.equal(text, active.answer);
        assertWire(NCP_MODEL, true);
        assert.equal(
          active.executions,
          choice === "none" ? 0 : 1,
          "Wrong tool execution count",
        );
        if (choice !== "none") {
          assert.ok(active.executedNonce, "Executor did not create a nonce");
          assert.ok(
            observations.some(
              (row) =>
                row.toolNonce === active.executedNonce &&
                row.reply === "tool-confirmation",
            ),
            "Actual nonce did not return at endpoint",
          );
        }
      });
    }
    await test(`sdk.${kind} explicitly rejects required with nonempty tools`, async () => {
      beginCase(kind === "stream", "tool", "required");
      let message = "";
      try {
        await sdkCall(kind, false, true);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      assert.ok(
        message.includes(GUARD_MESSAGE),
        "Provider guard was not reached",
      );
      assert.equal(
        observations.length,
        0,
        "Unsupported choice reached endpoint",
      );
      assert.equal(active.executions, 0, "Rejected choice executed a tool");
    });
    await test(`sdk.${kind} leaves existing provider required choice intact`, async () => {
      beginCase(kind === "stream", "tool", "required", "cerebras");
      let text: string;
      try {
        text = await sdkCall(kind, false, true);
      } catch {
        throw new Error("Paired existing-provider control did not complete");
      }
      assert.equal(text, active.answer);
      assertWire(CONTROL_MODEL, true);
      assert.equal(
        active.executions,
        1,
        "Existing provider did not execute required tool",
      );
      assert.ok(
        observations.some(
          (row) => row.toolChoice === "required" && row.reply === "tool-call",
        ),
        "Existing required choice was changed",
      );
      assert.ok(
        observations.some(
          (row) =>
            row.toolNonce === active.executedNonce &&
            row.reply === "tool-confirmation",
        ),
        "Existing provider lost its nonce",
      );
    });
    await test(`sdk.${kind} keeps required guard bounded to offered tools`, async () => {
      beginCase(kind === "stream", "plain", "required");
      let text: string;
      try {
        text = await sdkCall(kind);
      } catch {
        throw new Error("Tool-free public control did not complete");
      }
      assert.equal(text, active.answer);
      assertWire(NCP_MODEL, true);
      assert.equal(active.executions, 0);
    });
  }
} finally {
  await new Promise<void>((closed, reject) =>
    server.close((error) => (error ? reject(error) : closed())),
  );
}
await runSuite();
