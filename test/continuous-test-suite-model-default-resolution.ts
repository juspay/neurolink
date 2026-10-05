#!/usr/bin/env tsx
/**
 * Continuous Test Suite — which OpenAI model a call uses when none is named.
 *
 * ALL-DIST: every case runs the built CLI (`node dist/cli/index.js`) against a
 * local OpenAI-wire stand-in and reads the model id that reached the wire. No
 * determinism exception is taken and nothing is imported from `src/`.
 *
 * This is a characterization of the runtime resolver, green before and after
 * the change that corrected the documented defaults. It exists so a later edit
 * that moves the runtime default cannot hide behind a docs-only diff. The
 * documented order is: the explicit model, then OPENAI_MODEL, then the default
 * in the dynamic model configuration, then the registry default.
 *
 * The model configuration is served by a second local server (MODEL_CONFIG_URL)
 * whose OpenAI default is `gpt-4-turbo`: a model that is neither the registry
 * default nor the direct-constructor fallback, so it can only reach the wire
 * through the dynamic-configuration tier. No case reaches a network source
 * outside this machine.
 *
 * Not covered: modelChoices.ts (`getDefaultModel`, the interactive wizard
 * lists) has no shipped surface a test can reach without importing `src/` or
 * answering an interactive prompt.
 *
 * Run: npx tsx test/continuous-test-suite-model-default-resolution.ts
 *      pnpm run test:model-default-resolution
 */

process.env.NEUROLINK_SKIP_MCP = "true";

import "dotenv/config";
import { createServer } from "node:http";
import { assert, defineSuite, runCLI } from "./helpers/harness.js";
import { startChatStandIn } from "./helpers/chatStandIn.js";

const { test, runSuite } = defineSuite("OpenAI default model resolution", {
  offline: true,
  perTestTimeoutMs: 120_000,
});

const CONFIG_DEFAULT = "gpt-4-turbo";

/** Serves the same model registry for every path and method. */
async function startModelConfigServer() {
  const registry = {
    version: "1.0.0",
    lastUpdated: "2026-10-03",
    models: {
      openai: {
        [CONFIG_DEFAULT]: {
          id: CONFIG_DEFAULT,
          displayName: "GPT-4 Turbo",
          capabilities: ["function-calling"],
          deprecated: false,
          pricing: { input: 0.01, output: 0.03 },
          contextWindow: 128000,
          releaseDate: "2023-11-06",
        },
      },
    },
    defaults: { openai: CONFIG_DEFAULT },
  };
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(registry));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}/api/v1/models`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function modelsOnTheWire(options: {
  command: "generate" | "stream";
  openaiModelEnv: string;
  modelFlag?: string;
}): Promise<string[]> {
  const standIn = await startChatStandIn();
  const config = await startModelConfigServer();
  try {
    const res = await runCLI(
      [
        options.command,
        "Reply OK.",
        "--provider",
        "openai",
        ...(options.modelFlag ? ["--model", options.modelFlag] : []),
      ],
      {
        env: {
          OPENAI_API_KEY: "test-key",
          OPENAI_BASE_URL: `${standIn.baseURL}/v1`,
          OPENAI_MODEL: options.openaiModelEnv,
          MODEL_CONFIG_URL: config.url,
        },
        timeoutMs: 100_000,
      },
    );
    if (res.exitCode !== 0) {
      console.log(res.stderr.slice(-800));
    }
    assert(
      res.exitCode === 0,
      "the CLI call must succeed for the resolved model to mean anything",
    );
    return [...new Set(standIn.requestedModels())].sort();
  } finally {
    await standIn.close();
    await config.close();
  }
}

await test("generate with no model uses the default from the model configuration", async () => {
  const models = await modelsOnTheWire({
    command: "generate",
    openaiModelEnv: "",
  });
  assert(
    models.length === 1 && models[0] === CONFIG_DEFAULT,
    "the model on the wire must be the one the documented precedence selects",
  );
});

await test("stream with no model uses the default from the model configuration", async () => {
  const models = await modelsOnTheWire({
    command: "stream",
    openaiModelEnv: "",
  });
  assert(
    models.length === 1 && models[0] === CONFIG_DEFAULT,
    "the model on the wire must be the one the documented precedence selects",
  );
});

await test("OPENAI_MODEL beats the model configuration default", async () => {
  const models = await modelsOnTheWire({
    command: "generate",
    openaiModelEnv: "gpt-4o",
  });
  assert(
    models.length === 1 && models[0] === "gpt-4o",
    "the model on the wire must be the one the documented precedence selects",
  );
});

await test("--model beats both OPENAI_MODEL and the model configuration default", async () => {
  const models = await modelsOnTheWire({
    command: "generate",
    openaiModelEnv: "gpt-4o",
    modelFlag: "gpt-4o-mini",
  });
  assert(
    models.length === 1 && models[0] === "gpt-4o-mini",
    "the model on the wire must be the one the documented precedence selects",
  );
});

await runSuite();
