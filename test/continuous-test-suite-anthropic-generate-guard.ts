import assert from "node:assert/strict";
import { z } from "zod";
import { NeuroLink, tool, jsonSchema, ProviderError } from "../dist/index.js";
import { defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { startScriptedChatServer } from "./helpers/mockChatServer.js";

// Public generate() through a local Anthropic Messages endpoint. The fixture
// checks every outbound tool-use/result pairing, not just response success.
assertDistFresh();
const { test, runSuite } = defineSuite("Anthropic generate reclaim", {
  offline: true,
});
for (const stage of ["preview", "batches", "fits"] as const) {
  await test(`generate protects tool pairs and task during ${stage}`, async () => {
    const steps = 8;
    const size = stage === "batches" ? 115_000 : 0;
    const output = (i: number) =>
      stage === "preview"
        ? `${"A".repeat(85_000)}OUTPUT_${i}${"B".repeat(85_000)}`
        : `OUTPUT_${i}`;
    const message = (i: number, final = false) => ({
      id: `msg_${i}`,
      type: "message",
      role: "assistant",
      model: "claude-sonnet-4-20250514",
      content: final
        ? [{ type: "text", text: "complete" }]
        : [
            {
              type: "tool_use",
              id: `first_${i}`,
              name: "lookup",
              input: { i, padding: "x".repeat(size) },
            },
            {
              type: "tool_use",
              id: `second_${i}`,
              name: "lookup",
              input: { i, padding: "" },
            },
          ],
      stop_reason: final ? "end_turn" : "tool_use",
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    const server = await startScriptedChatServer([
      ...Array.from({ length: steps }, (_, i) => message(i)),
      message(steps, true),
    ]);
    const old = {
      url: process.env.ANTHROPIC_BASE_URL,
      key: process.env.ANTHROPIC_API_KEY,
    };
    process.env.ANTHROPIC_BASE_URL = server.baseURL.replace(/\/v1$/, "");
    process.env.ANTHROPIC_API_KEY = "sk-ant-offline-fixture";
    const sdk = new NeuroLink();
    let executed = 0;
    try {
      const result = await sdk.generate({
        input: { text: "PRESERVE_TASK" },
        systemPrompt: "PRESERVE_SYSTEM",
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        maxTokens: 1024,
        maxSteps: steps + 1,
        disableInternalFallback: true,
        tools: {
          lookup: tool({
            description: "Lookup a result",
            inputSchema: z.object({ i: z.number(), padding: z.string() }),
            execute: async ({ i }) => {
              executed++;
              return output(i);
            },
          }),
        },
      });
      assert.equal(
        executed,
        steps * 2,
        "precondition: both tools must run on every step",
      );
      assert.equal(
        server.requestCount(),
        steps + 1,
        "precondition: all endpoint requests must run",
      );
      assert.equal(result.content, "complete");
      const bodies = server.getAllRequestBodies().map(
        (body) =>
          JSON.parse(body) as {
            system?: unknown;
            messages: Array<{
              role: string;
              content: Array<{
                type: string;
                id?: string;
                tool_use_id?: string;
                content?: unknown;
              }>;
            }>;
          },
      );
      assert.ok(
        JSON.stringify(bodies[1]).includes("first_0"),
        "precondition: original tool call is present in 2nd request",
      );
      assert.ok(
        JSON.stringify(bodies[1]).includes("OUTPUT_0"),
        "precondition: original result is present in 2nd request",
      );
      for (const body of bodies) {
        const pending = new Set<string>();
        for (const msg of body.messages) {
          for (const block of msg.content) {
            if (block.type === "tool_use") {
              assert.ok(block.id, "tool call ID missing");
              pending.add(block.id);
            } else if (block.type === "tool_result") {
              assert.ok(
                block.tool_use_id && pending.delete(block.tool_use_id),
                "orphaned or duplicate tool result",
              );
            }
          }
          if (msg.role === "user") {
            assert.equal(
              pending.size,
              0,
              "unanswered tool call before next user turn",
            );
          }
        }
        assert.equal(pending.size, 0, "unanswered tool call at end of request");
      }
      const last = JSON.stringify(bodies.at(-1));
      assert.ok(
        last.includes("PRESERVE_TASK") && last.includes("PRESERVE_SYSTEM"),
        "task or system prompt was removed",
      );
      assert.ok(
        last.includes(`OUTPUT_${steps - 1}`),
        "protected tail was modified",
      );
      if (stage === "preview") {
        assert.ok(!last.includes("OUTPUT_0"), "old output was not previewed");
      }
      if (stage === "batches") {
        assert.ok(!last.includes("first_0"), "old batch was not removed");
      }
      if (stage === "fits") {
        for (let i = 0; i < steps; i++) {
          assert.ok(
            last.includes(`OUTPUT_${i}`) && last.includes(`first_${i}`),
            "fitting history was modified",
          );
        }
      }
    } finally {
      await sdk.shutdown();
      await server.close();
      if (old.url === undefined) {
        delete process.env.ANTHROPIC_BASE_URL;
      } else {
        process.env.ANTHROPIC_BASE_URL = old.url;
      }
      if (old.key === undefined) {
        delete process.env.ANTHROPIC_API_KEY;
      } else {
        process.env.ANTHROPIC_API_KEY = old.key;
      }
    }
  });
}
await test("generate() classifies a tool schema whose default self-references through the same provider-error contract as every other Anthropic generate failure, instead of leaking a raw JS exception", async () => {
  const server = await startScriptedChatServer([
    {
      id: "msg_0",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-4-20250514",
      content: [{ type: "text", text: "complete" }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    },
  ]);
  const old = {
    url: process.env.ANTHROPIC_BASE_URL,
    key: process.env.ANTHROPIC_API_KEY,
  };
  process.env.ANTHROPIC_BASE_URL = server.baseURL.replace(/\/v1$/, "");
  process.env.ANTHROPIC_API_KEY = "sk-ant-offline-fixture";
  const sdk = new NeuroLink();
  try {
    // A plain JSON Schema (the "external MCP tool" shape) whose `default`
    // points back at itself. `ensureNestedSchemaTypes` never walks `default`,
    // so the cycle survives into `v3Tools` untouched, and every step of the
    // native generate loop feeds it straight into
    // `getFixedOverheadTokens`'s serialization call. A genuinely circular
    // schema can never be sent over real JSON wire, so the turn still fails
    // end to end either way — what this asserts is that the failure is
    // funnelled through this provider's normal `handleProviderError`
    // classification (a `ProviderError`, matching every other Anthropic
    // generate failure), not a raw, unformatted JS exception that skipped
    // it because it was thrown before the retry/classification wrapper ever
    // ran.
    const selfReferentialSchema: Record<string, unknown> = {
      type: "object",
      properties: {},
    };
    selfReferentialSchema.default = selfReferentialSchema;
    await assert.rejects(
      sdk.generate({
        input: { text: "hello" },
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        disableInternalFallback: true,
        tools: {
          lookup: tool({
            description: "Lookup",
            inputSchema: jsonSchema(
              selfReferentialSchema as unknown as Parameters<
                typeof jsonSchema
              >[0],
            ),
            execute: async () => "ok",
          }),
        },
      }),
      (err: unknown) => {
        const cause = (err as Error & { cause?: unknown }).cause;
        assert.ok(
          cause instanceof ProviderError,
          "guard crash must reach handleProviderError like every other Anthropic generate failure, not escape as a raw, unclassified JS exception",
        );
        return true;
      },
    );
  } finally {
    await sdk.shutdown();
    await server.close();
    if (old.url === undefined) {
      delete process.env.ANTHROPIC_BASE_URL;
    } else {
      process.env.ANTHROPIC_BASE_URL = old.url;
    }
    if (old.key === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = old.key;
    }
  }
});
await runSuite();
