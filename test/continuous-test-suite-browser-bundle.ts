#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — browser bundle
 *
 * `dist/browser/neurolink.min.js` (the `@juspay/neurolink/browser` subpath)
 * had no test at all until the Vercel AI SDK removal replaced its provider
 * factories with native ones. The smoke written then lived in a scratch
 * directory and was never committed, so the bundle was back to zero coverage
 * the moment that session ended. This is that smoke, committed and wired in.
 *
 * It proves the bundle loads in Node, that the six factory exports the SDK
 * used to supply are still present and callable, that each factory hands back
 * a V3-shaped model handle synchronously, and that NeuroLink itself is still
 * exported. It also drives generate() and stream() through that bundled
 * NeuroLink constructor against a loopback HTTP server. No live credentials.
 * This is a Node smoke of the browser artifact, not a browser-engine test.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-browser-bundle.ts
 */

import assert from "node:assert/strict";
import type { NeuroLink } from "../dist/index.js";
import { defineSuite } from "./helpers/harness.js";
import {
  startMockChatServer,
  mockOpenAICredentials,
} from "./helpers/mockChatServer.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Browser bundle", { offline: true });

// Resolve at runtime: TypeScript must check the test, not re-check generated
// minified JavaScript as source through allowJs/checkJs.
const bundleURL = new URL("../dist/browser/neurolink.min.js", import.meta.url);
const bundle: Record<string, unknown> = await import(bundleURL.href);

const FACTORY_EXPORTS = [
  "createAnthropic",
  "anthropic",
  "createOpenAI",
  "openai",
  "createMistral",
  "mistral",
];

type Factory = (
  options: Record<string, unknown>,
) => (modelId: string) => Record<string, unknown>;

await test("every provider factory is exported and callable", async () => {
  const missing = FACTORY_EXPORTS.filter(
    (name) => typeof bundle[name] !== "function",
  );
  if (missing.length > 0) {
    throw new Error(`not exported as a function: ${missing.join(", ")}`);
  }
});

await test("each factory returns a V3-shaped model handle synchronously", async () => {
  const cases: Array<[string, string]> = [
    ["createAnthropic", "claude-sonnet-4-5"],
    ["createOpenAI", "gpt-4o-mini"],
    ["createMistral", "mistral-small-latest"],
  ];
  const problems: string[] = [];
  for (const [factory, modelId] of cases) {
    const make = bundle[factory] as Factory;
    const alias = factory.slice("create".length).toLowerCase();
    const direct = bundle[alias] as (id: string) => Record<string, unknown>;
    const handle = direct(modelId);
    assert.equal(handle.modelId, modelId, "direct export model ID mismatch");
    assert.equal(
      handle.specificationVersion,
      "v3",
      "direct export version mismatch",
    );
    assert.equal(
      typeof handle.doGenerate,
      "function",
      "direct export generation missing",
    );
    assert.equal(
      typeof handle.doStream,
      "function",
      "direct export streaming missing",
    );
    const model = make({})(modelId);
    if (model.specificationVersion !== "v3") {
      problems.push(`${factory}: specificationVersion`);
    }
    if (typeof model.doGenerate !== "function") {
      problems.push(`${factory}: doGenerate`);
    }
    if (typeof model.doStream !== "function") {
      problems.push(`${factory}: doStream`);
    }
    if (model.modelId !== modelId) {
      problems.push(`${factory}: modelId`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`model handle shape mismatch — ${problems.join("; ")}`);
  }
});

await test("NeuroLink is exported from the bundle", async () => {
  if (typeof bundle.NeuroLink !== "function") {
    throw new Error("NeuroLink is not exported as a constructor");
  }
});

for (const mode of ["generate", "stream"] as const) {
  await test(`bundled NeuroLink ${mode} reaches the wire and returns content`, async () => {
    assert.equal(
      typeof bundle.NeuroLink,
      "function",
      "bundle constructor missing",
    );
    const BundledNeuroLink = bundle.NeuroLink as typeof NeuroLink;
    const server = await startMockChatServer();
    const sdk = new BundledNeuroLink();
    try {
      const options = {
        input: { text: "BROWSER_WIRE_MARKER" },
        provider: "openai" as const,
        model: "gpt-4o-mini",
        disableTools: true,
        disableInternalFallback: true,
        credentials: mockOpenAICredentials(server),
        timeout: 10000,
      };
      let content = "";
      if (mode === "generate") {
        content = (await sdk.generate(options)).content;
      } else {
        const result = await sdk.stream(options);
        for await (const chunk of result.stream) {
          if ("content" in chunk && typeof chunk.content === "string") {
            content += chunk.content;
          }
        }
      }
      assert.equal(
        server.getAllRequestBodies().length,
        1,
        "unexpected request count",
      );
      const body: Record<string, unknown> = JSON.parse(
        server.getLastRequestBody() ?? "{}",
      );
      assert.equal(
        body.stream === true,
        mode === "stream",
        "wrong wire streaming mode",
      );
      assert.equal(body.model, "gpt-4o-mini", "wrong wire model");
      assert.ok(
        JSON.stringify(body.messages).includes("BROWSER_WIRE_MARKER"),
        "wire prompt missing",
      );
      assert.equal(content, "mock reply", "bundled response not delivered");
    } finally {
      await sdk.shutdown();
      await server.close();
    }
  });
}

await runSuite();
