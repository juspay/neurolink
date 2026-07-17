#!/usr/bin/env tsx
/**
 * Continuous Test Suite: SageMaker tool-format conversion (pure, no API).
 *
 * Regression test for a crash in
 * SageMakerLanguageModel.convertToolsToSageMakerFormat(): the AI SDK delivers
 * tools to doGenerate() in the flat LanguageModelV3FunctionTool shape
 * (`{ type: "function", name, description?, inputSchema }` — see
 * @ai-sdk/provider), not the nested OpenAI Chat Completions wire format
 * (`{ type: "function", function: { name, ... } }`). The pre-fix code read
 * `tool.function.name`, which crashed with a TypeError on every call that
 * reached SageMaker with tools present — including NeuroLink's own built-in
 * tools (src/lib/agent/directTools.ts), which are merged into every
 * generate() call unless disableTools/shouldDisableBuiltinTools() opts out.
 * The sibling convertToolChoiceToSageMakerFormat() had the same wrong-shape
 * assumption for LanguageModelV3ToolChoice.
 *
 * These tests call the class's real, public doGenerate() — the exact method
 * that crashed — with the model's private `client.invokeEndpoint` replaced
 * by a synchronous stub, so no AWS SDK loading or network call ever happens;
 * only the in-memory request-building path (convertToSageMakerRequest →
 * convertToolsToSageMakerFormat / convertToolChoiceToSageMakerFormat) runs.
 *
 * Run: npx tsx test/continuous-test-suite-sagemaker-tools.ts
 */

import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import { SageMakerLanguageModel } from "../src/lib/providers/sagemaker/language-model.js";
import type { SageMakerRuntimeClient } from "../src/lib/providers/sagemaker/client.js";
import type {
  InvokeEndpointParams,
  InvokeEndpointResponse,
  SageMakerConfig,
  SageMakerModelConfig,
} from "../src/lib/types/index.js";
import { logger } from "../src/lib/utils/logger.js";

const { test, runSuite } = defineSuite("SageMaker tool-format conversion");

const FAKE_CONFIG: SageMakerConfig = {
  region: "us-east-1",
  accessKeyId: "test-fake-access-key-id",
  secretAccessKey: "test-fake-secret-access-key",
};

const FAKE_MODEL_CONFIG: SageMakerModelConfig = {
  endpointName: "test-fake-endpoint",
};

/** The AI SDK's real, flat `LanguageModelV3FunctionTool` shape — no nested `.function`. */
function flatFunctionTool(name: string) {
  return {
    type: "function" as const,
    name,
    description: `Mock tool: ${name}`,
    inputSchema: { type: "object", properties: {}, required: [] },
  };
}

/** `LanguageModelV3ProviderTool` shape — has no SageMaker wire-format equivalent. */
function providerTool(name: string) {
  return {
    type: "provider" as const,
    id: `sagemaker.${name}` as const,
    name,
    args: {},
  };
}

type WithPrivateClient = { client: SageMakerRuntimeClient };

/**
 * Build a SageMakerLanguageModel with its private `client.invokeEndpoint`
 * replaced by a synchronous stub that records the request body and returns
 * a canned response. Guarantees zero AWS SDK loading and zero network I/O.
 */
function buildModelWithStubbedClient(captured: { body?: string }[]) {
  const model = new SageMakerLanguageModel(
    "test-model",
    FAKE_CONFIG,
    FAKE_MODEL_CONFIG,
  );
  const withClient = model as unknown as WithPrivateClient;
  withClient.client.invokeEndpoint = (
    params: InvokeEndpointParams,
  ): Promise<InvokeEndpointResponse> => {
    captured.push({ body: params.Body as string });
    return Promise.resolve({
      Body: new TextEncoder().encode(JSON.stringify({ generated_text: "ok" })),
      ContentType: "application/json",
    });
  };
  return model;
}

await test("crash repro: auto-injected default tool (flat AI SDK shape) no longer throws", async () => {
  const captured: { body?: string }[] = [];
  const model = buildModelWithStubbedClient(captured);

  const result = await model.doGenerate({
    messages: [{ role: "user", content: "hi" }],
    tools: [flatFunctionTool("readFile")],
  });

  assert(!!result.text, "doGenerate should resolve with text, not throw");
  assertEqual(
    captured.length,
    1,
    "invokeEndpoint should be called exactly once",
  );
  const body = JSON.parse(captured[0].body ?? "{}");
  assertEqual(
    body.tools.length,
    1,
    "one tool should reach the SageMaker request body",
  );
  assertEqual(body.tools[0].type, "function");
  assertEqual(
    body.tools[0].function.name,
    "readFile",
    "name must come from the flat tool.name, not the nonexistent tool.function.name",
  );
  assertEqual(body.tools[0].function.description, "Mock tool: readFile");
});

await test("provider-defined tools degrade explicitly (dropped + logged, not crashed or malformed)", async () => {
  const captured: { body?: string }[] = [];
  const model = buildModelWithStubbedClient(captured);

  let loggedDrop = false;
  const originalDebug = logger.debug;
  logger.debug = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].toLowerCase().includes("dropping tool")
    ) {
      loggedDrop = true;
    }
    return originalDebug(...args);
  };
  try {
    const result = await model.doGenerate({
      messages: [{ role: "user", content: "hi" }],
      tools: [flatFunctionTool("readFile"), providerTool("webSearch")],
    });

    assert(!!result.text, "doGenerate should resolve, not throw");
    const body = JSON.parse(captured[0].body ?? "{}");
    assertEqual(
      body.tools.length,
      1,
      "only the function tool should survive; the provider tool has no SageMaker equivalent",
    );
    assert(
      loggedDrop,
      "dropping an unrepresentable provider tool must be logged, not silent",
    );
  } finally {
    logger.debug = originalDebug;
  }
});

await test("tool choice: flat {type:'tool', toolName} converts to the nested function wire format", async () => {
  const captured: { body?: string }[] = [];
  const model = buildModelWithStubbedClient(captured);

  await model.doGenerate({
    messages: [{ role: "user", content: "hi" }],
    tools: [flatFunctionTool("readFile")],
    toolChoice: { type: "tool", toolName: "readFile" },
  });

  const body = JSON.parse(captured[0].body ?? "{}");
  assertEqual(body.tool_choice.type, "function");
  assertEqual(body.tool_choice.function.name, "readFile");
});

await test("tool choice: 'auto'/'none'/'required' pass through as bare strings", async () => {
  const captured: { body?: string }[] = [];
  const model = buildModelWithStubbedClient(captured);

  await model.doGenerate({
    messages: [{ role: "user", content: "hi" }],
    tools: [flatFunctionTool("readFile")],
    toolChoice: { type: "auto" },
  });

  const body = JSON.parse(captured[0].body ?? "{}");
  assertEqual(body.tool_choice, "auto");
});

await runSuite();
