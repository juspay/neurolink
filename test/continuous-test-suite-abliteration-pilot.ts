#!/usr/bin/env tsx
/**
 * Abliteration's first catalog model through the shipped SDK and built CLI.
 * The owned backend checks the documented chat route, Bearer credentials,
 * default model, unique user prompt, output budget, effective stream mode,
 * and absence of empty tools/tool_choice. Each surface also rejects a bad
 * explicit model without silently choosing another model.
 * Public MODEL_CONFIG_URL resolves through this owned listener; a valid
 * empty registry preserves the unknown provider's actual catalog default.
 *
 * Public documentation is source evidence; this fixture is a wire contract,
 * not vendor availability, account entitlement, or live inference evidence.
 * --package-root selects an installed artifact without importing its source.
 */
import "./helpers/credentialFreeEnv.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  defineSuite,
  runCommand as runHarnessCommand,
  tempDir,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

type PublicSDK = typeof import("../dist/index.js");
type WireBody = {
  model?: string;
  stream?: boolean;
  messages?: Array<{ role?: string; content?: unknown }>;
  max_tokens?: unknown;
  tools?: unknown;
  tool_choice?: unknown;
};
type Observation = {
  path: string;
  authMatchesFixture: boolean;
  model: string | undefined;
  stream: boolean;
  toolsPresent: boolean;
  toolChoicePresent: boolean;
  validBody: boolean;
  inputRecognized: boolean;
  validStreamMode: boolean;
  maxTokens: number | undefined;
  rejection?: "invalid-wire" | "invalid-model";
  servedModel?: string;
};

const args = process.argv.slice(2);
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
const packageRootIndex = args.indexOf("--package-root");
const root = resolve(packageRootIndex < 0 ? "." : args[packageRootIndex + 1]);
if (packageRootIndex < 0) {
  assertDistFresh({ entrypoints: ["dist/index.js", "dist/cli/index.js"] });
}
const publicSDK = (await import(
  pathToFileURL(join(root, "dist/index.js")).href
)) as PublicSDK;
const { test, runSuite } = defineSuite("Abliteration owned public paths", {
  offline: true,
});
const MODEL = "abliterated-model";
const BAD_MODEL = "growth-pilot-invalid-model";
const FIXTURE_KEY = "growth-pilot-fixture-key";
let activeCase = { prompt: "", answer: "", stream: false };
const observations: Observation[] = [];
const metadataObservations: Array<{ method: string; path: string }> = [];
const OWNED_MODEL_REGISTRY = {
  version: "abliteration-owned-empty-registry-v1",
  lastUpdated: "2026-10-09T00:00:00.000Z",
  models: {},
  defaults: {},
  aliases: {},
};

function textContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .filter(
      (part): part is { type: "text"; text: string } =>
        part !== null &&
        typeof part === "object" &&
        part.type === "text" &&
        typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("");
}

function beginCase(stream: boolean): void {
  observations.length = 0;
  activeCase = {
    prompt: `OWNED_PROMPT_${randomUUID()}`,
    answer: `OWNED_ANSWER_${randomUUID()}`,
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
  let body: WireBody = {};
  let validBody = false;
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString());
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      body = parsed as WireBody;
      validBody = true;
    }
  } catch {
    // A malformed wire request must receive a rejection, never the answer.
  }
  const observation: Observation = {
    path: req.url ?? "",
    authMatchesFixture: req.headers.authorization === `Bearer ${FIXTURE_KEY}`,
    model: body.model,
    stream: body.stream === true,
    toolsPresent: Object.hasOwn(body, "tools"),
    toolChoicePresent: Object.hasOwn(body, "tool_choice"),
    validBody,
    inputRecognized:
      activeCase.prompt.length > 0 &&
      Array.isArray(body.messages) &&
      body.messages.length > 0 &&
      body.messages.some(
        (message) =>
          message !== null &&
          typeof message === "object" &&
          message.role === "user" &&
          textContent(message.content).includes(activeCase.prompt),
      ),
    validStreamMode: activeCase.stream
      ? body.stream === true
      : body.stream === undefined || body.stream === false,
    maxTokens:
      typeof body.max_tokens === "number" ? body.max_tokens : undefined,
  };
  observations.push(observation);
  if (req.method !== "POST" || observation.path !== "/v1/chat/completions") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "Wrong owned route" } }));
    return;
  }
  if (
    !observation.authMatchesFixture ||
    !observation.validBody ||
    typeof body.model !== "string" ||
    body.model.length === 0 ||
    !observation.inputRecognized ||
    !observation.validStreamMode ||
    observation.maxTokens !== 32 ||
    observation.toolsPresent ||
    observation.toolChoicePresent
  ) {
    observation.rejection = "invalid-wire";
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: {
          message: "Invalid owned request",
          type: "invalid_request_error",
          code: "invalid_request",
        },
      }),
    );
    return;
  }
  if (body.model !== MODEL) {
    observation.rejection = "invalid-model";
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: {
          message: "Unsupported model",
          type: "invalid_request_error",
          code: "invalid_model",
        },
      }),
    );
    return;
  }
  // This value is assigned only when the endpoint actually emits a reply.
  observation.servedModel = MODEL;
  if (body.stream) {
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    for (const [delta, finish] of [
      [{ role: "assistant", content: activeCase.answer }, null],
      [{}, "stop"],
    ] as const) {
      res.write(
        `data: ${JSON.stringify({ id: "growth-stream", object: "chat.completion.chunk", created: 0, model: MODEL, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`,
      );
    }
    res.end("data: [DONE]\n\n");
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: "growth-generate",
        object: "chat.completion",
        created: 0,
        model: MODEL,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: activeCase.answer },
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
assert.ok(address && typeof address === "object", "Owned endpoint missing");
process.env.MODEL_CONFIG_URL = `http://127.0.0.1:${address.port}/api/v1/models`;
process.env.ABLITERATION_API_KEY = FIXTURE_KEY;
process.env.ABLITERATION_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
process.env.NEUROLINK_SKIP_MCP = "true";
delete process.env.ABLITERATION_MODEL;

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

async function runCommand(
  ...command: Parameters<typeof runHarnessCommand>
): ReturnType<typeof runHarnessCommand> {
  const metadataBefore = metadataObservations.length;
  const result = await runHarnessCommand(...command);
  const explicitModel = (command[1] ?? []).includes("--model");
  assertMetadataWire(metadataBefore, !explicitModel);
  return result;
}

function assertWire(
  requestedModel: string,
  expectReply: boolean,
  expectStream: boolean,
): void {
  assert.ok(observations.length > 0, "Owned endpoint was not reached");
  for (const row of observations) {
    assert.equal(row.path, "/v1/chat/completions", "Chat route changed");
    assert.equal(row.authMatchesFixture, true, "Bearer mapping changed");
    assert.equal(
      row.model,
      requestedModel,
      "Pinned model changed or fell back",
    );
    assert.equal(row.toolsPresent, false, "Empty tools were emitted");
    assert.equal(row.toolChoicePresent, false, "Tool choice without tools");
    assert.equal(row.validBody, true, "Wire body is malformed");
    assert.equal(row.inputRecognized, true, "Required user prompt was dropped");
    assert.equal(row.validStreamMode, true, "Wire stream mode is invalid");
    assert.equal(row.stream, expectStream, "Wire stream mode changed");
    assert.equal(row.maxTokens, 32, "Explicit output budget was not forwarded");
    assert.equal(
      row.rejection,
      expectReply ? undefined : "invalid-model",
      "Case did not reach its intended response or model rejection",
    );
  }
  if (expectReply) {
    assert.ok(
      observations.some((row) => row.servedModel === MODEL),
      "The owned backend did not emit a reply",
    );
  } else {
    assert.ok(
      observations.every((row) => row.servedModel === undefined),
      "Rejected model produced a reply",
    );
  }
}

async function sdkCall(
  kind: "generate" | "stream",
  badModel: boolean,
): Promise<string> {
  const metadataBefore = metadataObservations.length;
  const expectMetadataInitialization = !badModel && metadataBefore === 0;
  let sdkSucceeded = false;
  const client = new publicSDK.NeuroLink({
    conversationMemory: { enabled: false },
  });
  try {
    const options = {
      provider: "abliteration",
      ...(badModel ? { model: BAD_MODEL } : {}),
      input: { text: activeCase.prompt },
      disableTools: true,
      disableInternalFallback: true,
      maxTokens: 32,
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

try {
  for (const kind of ["generate", "stream"] as const) {
    for (const surface of ["sdk", "cli"] as const) {
      await test(`${surface}.${kind} uses catalog default and owned route`, async () => {
        beginCase(kind === "stream");
        let text: string;
        if (surface === "sdk") {
          try {
            text = await sdkCall(kind, false);
          } catch {
            throw new Error("Public SDK owned-path case did not complete");
          }
        } else {
          const home = tempDir("growth-pilot-cli-");
          const result = await runCommand(
            "node",
            [
              join(root, "dist/cli/index.js"),
              kind,
              activeCase.prompt,
              "--provider",
              "abliteration",
              "--disableTools",
              "--disable-internal-fallback",
              "--quiet",
              "--maxTokens",
              "32",
              ...(kind === "generate" ? ["--format", "json"] : []),
            ],
            {
              cwd: home,
              env: { ...process.env, HOME: home },
              timeoutMs: 60_000,
            },
          );
          assert.equal(result.exitCode, 0, "Built CLI owned-path case failed");
          text =
            kind === "generate"
              ? (JSON.parse(result.stdout) as { content: string }).content
              : result.stdout.trim();
        }
        assert.equal(
          text,
          activeCase.answer,
          "Public output differs from backend result",
        );
        assertWire(MODEL, true, kind === "stream");
      });

      await test(`${surface}.${kind} rejects bad model without fallback`, async () => {
        beginCase(kind === "stream");
        let rejected = false;
        if (surface === "sdk") {
          try {
            await sdkCall(kind, true);
          } catch {
            rejected = true;
          }
        } else {
          const home = tempDir("growth-pilot-cli-negative-");
          const result = await runCommand(
            "node",
            [
              join(root, "dist/cli/index.js"),
              kind,
              activeCase.prompt,
              "--provider",
              "abliteration",
              "--model",
              BAD_MODEL,
              "--disableTools",
              "--disable-internal-fallback",
              "--quiet",
              "--maxTokens",
              "32",
            ],
            {
              cwd: home,
              env: { ...process.env, HOME: home },
              timeoutMs: 60_000,
            },
          );
          rejected = result.exitCode !== 0;
        }
        assert.equal(rejected, true, "Pinned invalid model was accepted");
        assertWire(BAD_MODEL, false, kind === "stream");
      });
    }
  }
} finally {
  await new Promise<void>((closed, reject) => {
    server.close((error) => (error ? reject(error) : closed()));
  });
}
await runSuite();
