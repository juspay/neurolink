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
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z as z3 } from "zod/v3";
import type { AIProviderFactory, NeuroLink } from "../dist/index.js";
import { defineSuite, runCommand } from "./helpers/harness.js";
import {
  startMockChatServer,
  startScriptedChatServer,
  chatCompletion,
  mockOpenAICredentials,
} from "./helpers/mockChatServer.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

// assertDistFresh only proves dist/index.js is present and newer than src/.
// This suite's whole subject is the browser artifact, which build:browser
// emits separately — so say precisely which build is missing.
const bundlePath = fileURLToPath(
  new URL("../dist/browser/neurolink.min.js", import.meta.url),
);
if (!existsSync(bundlePath)) {
  throw new Error(
    "dist/browser/neurolink.min.js is missing — this suite tests the browser " +
      "bundle specifically. Run `pnpm run build` first (it runs build:browser).",
  );
}

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

/**
 * The browser artifact's `module` stub answers every `require()` with `{}`
 * for anything except `zod-to-json-schema`/`json-schema-to-zod` (see
 * scripts/build-browser.mjs). Zod 3 schemas — the fallback path in
 * schemaConversion.ts, since Zod 4's native `z.toJSONSchema` only recognises
 * its own internal `_zod` marker — are the one input shape that actually
 * exercises `require("zod-to-json-schema")` at runtime. A Zod 4 schema
 * (what the rest of this suite uses) never reaches that code path and so
 * cannot tell the two stub shapes apart.
 *
 * Extracts a narrow, typed shape out of a wire request body without `any`.
 */
type WireBody = {
  response_format?: {
    json_schema?: { schema?: { properties?: Record<string, unknown> } };
  };
  tools?: Array<{
    function?: {
      name?: string;
      parameters?: { properties?: Record<string, unknown> };
    };
  }>;
};

function parseWireBody(raw: string): WireBody | undefined {
  try {
    return JSON.parse(raw) as WireBody;
  } catch {
    return undefined;
  }
}

for (const mode of ["generate", "stream"] as const) {
  await test(`bundled ${mode}({ schema }) fills a Zod 3 schema's properties over the wire`, async () => {
    const BundledNeuroLink = bundle.NeuroLink as typeof NeuroLink;
    // Scripted, schema-valid content: a fixed non-JSON "mock reply" would
    // fail structured-output parsing and could trigger a retry, which would
    // make the request count part of this test's evidence instead of an
    // incidental detail. One scripted reply is repeated for any further
    // request, so a retry (if one still happens) sees the same valid body.
    const server = await startScriptedChatServer([
      chatCompletion({
        content: JSON.stringify({ city: "Paris", temperature: 21 }),
      }),
    ]);
    const sdk = new BundledNeuroLink();
    try {
      const zod3Schema = z3.object({
        city: z3.string(),
        temperature: z3.number(),
      });
      const options = {
        input: { text: `ZOD3_SCHEMA_${mode.toUpperCase()}` },
        provider: "openai" as const,
        model: "gpt-4o-mini",
        // Zod 3 schemas are structurally `object`, so the generate/stream
        // `schema` option (typed for Zod 4's ZodUnknownSchema) accepts one
        // without a cast — this is exactly the runtime-compatible fallback
        // schemaConversion.ts documents.
        schema: zod3Schema,
        disableTools: true,
        disableInternalFallback: true,
        credentials: mockOpenAICredentials(server),
        timeout: 10000,
      };
      if (mode === "generate") {
        await sdk.generate(options);
      } else {
        const result = await sdk.stream(options);
        for await (const _chunk of result.stream) {
          void _chunk;
        }
      }
      const bodies = server.getAllRequestBodies();
      assert.ok(
        bodies.length >= 1,
        "precondition: no request reached the mock server",
      );
      const withFormat = bodies
        .map(parseWireBody)
        .find((body) => body?.response_format?.json_schema?.schema);
      assert.ok(
        withFormat,
        "precondition: no request carried a response_format json_schema — the schema path was not exercised",
      );
      const properties =
        withFormat?.response_format?.json_schema?.schema?.properties ?? {};
      assert.ok(
        Object.keys(properties).length > 0,
        "bundled Zod 3 schema reached the wire with an empty properties object",
      );
      assert.ok(
        "city" in properties && "temperature" in properties,
        "bundled Zod 3 schema is missing its declared properties on the wire",
      );
    } finally {
      await sdk.shutdown();
      await server.close();
    }
  });
}

await test("bundled generate() sends a Zod 3 tool's parameters over the wire", async () => {
  const BundledNeuroLink = bundle.NeuroLink as typeof NeuroLink;
  const server = await startMockChatServer();
  const sdk = new BundledNeuroLink();
  try {
    sdk.registerTool("browser_zod3_tool", {
      name: "browser_zod3_tool",
      description: "probe tool with a Zod 3 input schema",
      inputSchema: z3.object({
        location: z3.string(),
        unit: z3.string(),
      }),
      execute: async () => ({ ok: true }),
    });
    await sdk.generate({
      input: { text: "ZOD3_TOOL_GENERATE" },
      provider: "openai" as const,
      model: "gpt-4o-mini",
      disableTools: false,
      disableInternalFallback: true,
      credentials: mockOpenAICredentials(server),
      timeout: 10000,
    });
    const bodies = server.getAllRequestBodies();
    assert.ok(
      bodies.length >= 1,
      "precondition: no request reached the mock server",
    );
    const withTool = bodies
      .map(parseWireBody)
      .find((body) =>
        body?.tools?.some((t) => t.function?.name === "browser_zod3_tool"),
      );
    assert.ok(
      withTool,
      "precondition: no request carried the registered Zod 3 tool on the wire",
    );
    const tool = withTool?.tools?.find(
      (t) => t.function?.name === "browser_zod3_tool",
    );
    const properties = tool?.function?.parameters?.properties ?? {};
    assert.ok(
      Object.keys(properties).length > 0,
      "bundled Zod 3 tool reached the wire with an empty parameters object",
    );
    assert.ok(
      "location" in properties && "unit" in properties,
      "bundled Zod 3 tool is missing its declared parameters on the wire",
    );
  } finally {
    await sdk.shutdown();
    await server.close();
  }
});

/**
 * The other package the `module` stub serves is `json-schema-to-zod`. Only
 * ToolsManager reaches it, for a custom tool whose `parameters` is a plain
 * JSON Schema object: `NeuroLink.registerTool()` keeps such a schema as it is
 * and never converts it, so no registered tool gets here. A provider from
 * `AIProviderFactory` with a tool handed to `setupToolExecutor` does, and the
 * bundle exports both. Without the stub's help the conversion finds no
 * `jsonSchemaToZod` function and the tool goes out with no properties.
 */
await test("bundled provider sends a JSON Schema tool's parameters over the wire", async () => {
  const BundledFactory = bundle.AIProviderFactory as typeof AIProviderFactory;
  assert.equal(
    typeof BundledFactory?.createProvider,
    "function",
    "precondition: the bundle does not export AIProviderFactory.createProvider",
  );
  const server = await startMockChatServer();
  try {
    const provider = await BundledFactory.createProvider(
      "openai",
      "gpt-4o-mini",
      false,
      undefined,
      undefined,
      mockOpenAICredentials(server),
    );
    provider.setupToolExecutor(
      {
        customTools: new Map([
          [
            "browser_json_schema_tool",
            {
              description:
                "probe tool with a plain JSON Schema parameters object",
              parameters: {
                type: "object",
                properties: {
                  city: { type: "string" },
                  unit: { type: "string" },
                },
                required: ["city"],
              },
              execute: async () => ({ ok: true }),
            },
          ],
        ]),
        executeTool: async () => ({ ok: true }),
      },
      "browser-bundle-test",
    );
    await provider.generate({
      input: { text: "JSON_SCHEMA_TOOL_GENERATE" },
      disableTools: false,
      timeout: 10000,
    });
    const bodies = server.getAllRequestBodies();
    assert.ok(
      bodies.length >= 1,
      "precondition: no request reached the mock server",
    );
    const withTool = bodies
      .map(parseWireBody)
      .find((body) =>
        body?.tools?.some(
          (t) => t.function?.name === "browser_json_schema_tool",
        ),
      );
    assert.ok(
      withTool,
      "precondition: no request carried the JSON Schema tool on the wire",
    );
    const tool = withTool?.tools?.find(
      (t) => t.function?.name === "browser_json_schema_tool",
    );
    const properties = tool?.function?.parameters?.properties ?? {};
    assert.ok(
      Object.keys(properties).length > 0,
      "bundled JSON Schema tool reached the wire with an empty parameters object",
    );
    assert.ok(
      "city" in properties && "unit" in properties,
      "bundled JSON Schema tool is missing its declared parameters on the wire",
    );
  } finally {
    await server.close();
  }
});

await test("browser artifact supplies callback timers when Node immediates are absent", async () => {
  const script = `
    import assert from "node:assert/strict";
    process.on("unhandledRejection", (error) => {
      console.error(String(error?.message ?? error));
      process.exitCode = 1;
    });
    delete globalThis.setImmediate;
    delete globalThis.clearImmediate;
    await import(${JSON.stringify(bundleURL.href)});
    const value = await new Promise((resolve) => setImmediate(resolve, 42));
    assert.equal(value, 42);
    let fired = false;
    const handle = setImmediate(() => { fired = true; });
    clearImmediate(handle);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(fired, false);
  `;
  const result = await runCommand(
    process.execPath,
    ["--input-type=module", "-e", script],
    { timeoutMs: 30_000 },
  );
  if (result.exitCode !== 0) {
    console.error(result.stderr);
  }
  assert.equal(result.exitCode, 0, "browser timer fixture failed");
});

await test("importing the bundle and exiting leaves no uncaught error", async () => {
  const { spawn } = await import("node:child_process");
  const script = `await import(${JSON.stringify(bundleURL.href)}); console.log("ok");`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
  child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
  // Bounded: this case is about teardown, so a bundle that keeps the child
  // alive must fail readably rather than hang until the runner kills it.
  const code: number = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve(-2);
    }, 30_000);
    child.on("close", (c) => {
      clearTimeout(timer);
      resolve(c ?? -1);
    });
  });
  assert.notEqual(code, -2, "the child never exited — the bundle held it open");
  assert.ok(stdout.includes("ok"), "precondition: the bundle never imported");
  assert.equal(
    /TypeError|is not a function/.test(stderr),
    false,
    "the bundle raised a TypeError on the way out",
  );
  assert.equal(code, 0, "importing the bundle and exiting did not exit 0");
});

/**
 * `doStream` on a factory handle is advertised as a function but cannot
 * stream: the delegating model it forwards to implements generation only, and
 * NeuroLink's own streaming runs through `executeStream`. The old assertion
 * checked `typeof doStream === "function"` and so passed over this entirely.
 * Pin the real behaviour instead — including that the message names the
 * supported path — so the limitation cannot be mistaken for a capability.
 */
await test("a factory handle's doStream fails with an actionable message", async () => {
  const make = bundle.createOpenAI as Factory;
  const model = make({ apiKey: "sk-not-used" })("gpt-4o-mini");
  assert.equal(
    typeof model.doStream,
    "function",
    "precondition: doStream is not even advertised",
  );
  let message = "";
  try {
    await (model.doStream as (o: unknown) => Promise<unknown>)({ prompt: [] });
    assert.fail("doStream resolved; it cannot stream and must say so");
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  // `includes("NeuroLink")` was too weak: it passed while the message was a
  // malformed multi-line template literal whose text contained a stray quote,
  // a `+` and the source indentation. Pin the exact string.
  assert.equal(
    message,
    "openai: doStream is not implemented on the delegating model. " +
      "NeuroLink streams through executeStream, reached via NeuroLink.stream() — " +
      "use that (the browser bundle exports the NeuroLink class) rather than " +
      "calling doStream on a model handle.",
    "doStream's failure message is not the intended one",
  );
});

await runSuite();
