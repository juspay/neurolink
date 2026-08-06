#!/usr/bin/env tsx
/**
 * Continuous Test Suite: additive structured output on the native Anthropic
 * Messages surface (pure, no API).
 *
 * The provider's only structured path used to be `responseFormat.type ===
 * "json"`, which REPLACES the tools array with a single json tool and pins
 * `tool_choice` to it — mutually exclusive with real tools, so any caller
 * passing `schema` alongside tools (every agent/MCP turn) silently lost the
 * schema and got prose back.
 *
 * The fix appends a `final_result` tool instead, leaving `tool_choice` on
 * auto. Covered here:
 *   - the pure helpers (tool shape, append guards, system instruction,
 *     payload stringification)
 *   - doGenerate: schema + tools (final_result appended LAST, real tools
 *     intact, tool_choice still auto), the final_result response unwrap
 *     (single text part, zero tool calls, finishReason "stop"), real tool
 *     calls still passing through, schema WITHOUT tools (the pre-existing
 *     forced-json path, unchanged), and no schema at all
 *   - executeStream: the same three cases, plus the single-chunk delivery
 *     contract and the prose fallback when the model ignores final_result
 *   - GenerationHandler: the providerOptions channel that carries the JSON
 *     Schema to the provider, and the providers it must NOT fire for
 *
 * Driven through a mock-injected `client.messages.create` (the private
 * `client` field is overridden with a cast, matching the precedent in
 * continuous-test-suite-anthropic-cap.ts).
 *
 * Runner: `npx tsx test/continuous-test-suite-anthropic-structured-tools.ts`
 * (package.json: `pnpm run test:anthropic-structured`).
 */
import "dotenv/config";

import { z } from "zod";

import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import {
  appendFinalResultInstruction,
  appendFinalResultTool,
  buildFinalResultTool,
  FINAL_RESULT_INSTRUCTION,
  FINAL_RESULT_TOOL_NAME,
  stringifyFinalResultInput,
} from "../src/lib/providers/anthropic/structuredOutput.js";
import { AnthropicProvider } from "../src/lib/providers/anthropic/client.js";
import { GenerationHandler } from "../src/lib/core/modules/GenerationHandler.js";
import { convertZodToJsonSchema } from "../src/lib/utils/schemaConversion.js";

const { test, runSuite } = defineSuite("Anthropic additive structured output");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** The envelope shape production callers pass on every turn. */
const ENVELOPE_SCHEMA = z.object({
  summary: z.string(),
  blocks: z.array(z.string()),
  attachment: z.string().optional(),
});

const ENVELOPE_JSON_SCHEMA = convertZodToJsonSchema(
  ENVELOPE_SCHEMA as never,
) as Record<string, unknown>;

const ENVELOPE_PAYLOAD = {
  summary: "deploy finished",
  blocks: ["section-1", "section-2"],
};

/** A caller tool that must survive the additive pattern untouched. */
const SEARCH_TOOL = {
  type: "function" as const,
  name: "search_docs",
  description: "Search the docs",
  inputSchema: { type: "object", properties: { q: { type: "string" } } },
};

type MessagesCreateParams = {
  tools?: Array<{ name: string; input_schema?: unknown }>;
  tool_choice?: { type: string; name?: string };
  system?: string | Array<{ type: string; text: string }>;
  stream?: boolean;
};

/** Records every request the provider issues and replays canned responses. */
function mockClient(responses: unknown[]): {
  client: { messages: { create: (params: unknown) => Promise<unknown> } };
  requests: MessagesCreateParams[];
} {
  const requests: MessagesCreateParams[] = [];
  let index = 0;
  return {
    requests,
    client: {
      messages: {
        create: async (params: unknown) => {
          requests.push(params as MessagesCreateParams);
          const next = responses[Math.min(index, responses.length - 1)];
          index++;
          return next;
        },
      },
    },
  };
}

/** Build a provider with the network client replaced by `client`. */
function providerWith(client: unknown): AnthropicProvider {
  const provider = new AnthropicProvider(
    "claude-sonnet-4-6",
    undefined,
    undefined,
    { apiKey: "test-key-not-used" },
  );
  (provider as unknown as { client: unknown }).client = client;
  return provider;
}

/** A non-streaming Messages response. */
function messagesResponse(
  content: Array<Record<string, unknown>>,
  stopReason: string,
): Record<string, unknown> {
  return {
    id: "msg_test",
    model: "claude-sonnet-4-6",
    content,
    stop_reason: stopReason,
    usage: { input_tokens: 10, output_tokens: 5 },
  };
}

/** An SSE event sequence for one streamed step. */
function streamEvents(
  blocks: Array<
    | { kind: "text"; text: string }
    | { kind: "tool"; id: string; name: string; input: string }
  >,
  stopReason: string,
): AsyncIterable<unknown> {
  const events: unknown[] = [
    {
      type: "message_start",
      message: { usage: { input_tokens: 10, output_tokens: 0 } },
    },
  ];
  blocks.forEach((block, index) => {
    if (block.kind === "text") {
      events.push({
        type: "content_block_start",
        index,
        content_block: { type: "text" },
      });
      events.push({
        type: "content_block_delta",
        index,
        delta: { type: "text_delta", text: block.text },
      });
    } else {
      events.push({
        type: "content_block_start",
        index,
        content_block: { type: "tool_use", id: block.id, name: block.name },
      });
      events.push({
        type: "content_block_delta",
        index,
        delta: { type: "input_json_delta", partial_json: block.input },
      });
    }
  });
  events.push({
    type: "message_delta",
    delta: { stop_reason: stopReason },
    usage: { output_tokens: 5 },
  });
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
    },
  };
}

/** Drain a StreamResult into the list of non-empty content chunks. */
async function drain(stream: AsyncIterable<unknown>): Promise<string[]> {
  const chunks: string[] = [];
  for await (const chunk of stream) {
    const content = (chunk as { content?: string }).content;
    if (typeof content === "string" && content.length > 0) {
      chunks.push(content);
    }
  }
  return chunks;
}

/** doGenerate call options shared by the generate-path tests. */
function generateOptions(
  extra: Record<string, unknown>,
): Record<string, unknown> {
  return {
    prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

await test("buildFinalResultTool produces an object-rooted input_schema", () => {
  const tool = buildFinalResultTool(ENVELOPE_JSON_SCHEMA);
  assertEqual(tool.name, FINAL_RESULT_TOOL_NAME, "tool name");
  assert(
    (tool.description ?? "").includes("final structured result"),
    "description states the contract",
  );
  const schema = tool.input_schema as unknown as {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
  assertEqual(schema.type, "object", "input_schema is object-rooted");
  assertEqual(
    Object.keys(schema.properties).sort().join(","),
    "attachment,blocks,summary",
    "every schema property is carried through",
  );
  assertEqual(
    schema.required.sort().join(","),
    "blocks,summary",
    "required list is carried through (optional field excluded)",
  );
  assert(!("$schema" in schema), "the $schema keyword is dropped");
});

await test("appendFinalResultTool appends LAST and leaves the input untouched", () => {
  const original = [
    { name: "a", input_schema: { type: "object" as const } },
    { name: "b", input_schema: { type: "object" as const } },
  ];
  const result = appendFinalResultTool(original, ENVELOPE_JSON_SCHEMA);
  assertEqual(result.applied, true, "applied");
  assertEqual(
    (result.tools ?? []).map((t) => t.name).join(","),
    `a,b,${FINAL_RESULT_TOOL_NAME}`,
    "real tools preserved in order, final_result last",
  );
  assertEqual(original.length, 2, "caller's array is not mutated");
});

await test("appendFinalResultTool declines when there is nothing to preserve", () => {
  assertEqual(
    appendFinalResultTool([], ENVELOPE_JSON_SCHEMA).applied,
    false,
    "empty tool list → not applied",
  );
  assertEqual(
    appendFinalResultTool(undefined, ENVELOPE_JSON_SCHEMA).applied,
    false,
    "no tool list → not applied",
  );
});

await test("appendFinalResultTool never shadows a caller tool of the same name", () => {
  const callerTools = [
    { name: FINAL_RESULT_TOOL_NAME, input_schema: { type: "object" as const } },
  ];
  const result = appendFinalResultTool(callerTools, ENVELOPE_JSON_SCHEMA);
  assertEqual(result.applied, false, "not applied");
  assertEqual((result.tools ?? []).length, 1, "caller's tool list unchanged");
});

await test("appendFinalResultInstruction handles both system shapes", () => {
  assertEqual(
    appendFinalResultInstruction("base"),
    "base" + FINAL_RESULT_INSTRUCTION,
    "string system is concatenated",
  );
  const cached = [
    {
      type: "text" as const,
      text: "cached prefix",
      cache_control: { type: "ephemeral" as const },
    },
  ];
  const blocks = appendFinalResultInstruction(cached) as Array<{
    text: string;
    cache_control?: unknown;
  }>;
  assertEqual(blocks.length, 2, "a NEW block is appended");
  assertEqual(blocks[0].text, "cached prefix", "cached block text unchanged");
  assert(
    blocks[0].cache_control !== undefined,
    "cached block keeps its breakpoint",
  );
  assert(
    blocks[1].text.includes(FINAL_RESULT_TOOL_NAME),
    "new block carries the instruction",
  );
  assertEqual(cached.length, 1, "caller's block array is not mutated");
});

await test("stringifyFinalResultInput canonicalizes, and keeps truncated JSON", () => {
  assertEqual(
    stringifyFinalResultInput('{ "a" :  1 }'),
    '{"a":1}',
    "well-formed input is canonicalized",
  );
  assertEqual(
    stringifyFinalResultInput(""),
    "{}",
    "empty input → empty object",
  );
  // A payload cut off by the token cap must still reach the caller's
  // coercion/repair layer rather than being dropped.
  assertEqual(
    stringifyFinalResultInput('{"summary":"tru'),
    '{"summary":"tru',
    "truncated input is returned verbatim",
  );
});

// ---------------------------------------------------------------------------
// doGenerate
// ---------------------------------------------------------------------------

await test("doGenerate: schema + tools appends final_result and keeps tool_choice auto", async () => {
  const { client, requests } = mockClient([
    messagesResponse(
      [
        {
          type: "tool_use",
          id: "tu_1",
          name: FINAL_RESULT_TOOL_NAME,
          input: ENVELOPE_PAYLOAD,
        },
      ],
      "tool_use",
    ),
  ]);
  const model = providerWith(client).getAISDKModel();
  await (
    model as unknown as {
      doGenerate: (o: unknown) => Promise<unknown>;
    }
  ).doGenerate(
    generateOptions({
      tools: [SEARCH_TOOL],
      providerOptions: {
        anthropic: { finalResultSchema: ENVELOPE_JSON_SCHEMA },
      },
    }),
  );

  const sent = requests[0];
  assertEqual(
    (sent.tools ?? []).map((t) => t.name).join(","),
    `search_docs,${FINAL_RESULT_TOOL_NAME}`,
    "real tool intact, final_result appended last",
  );
  assertEqual(
    sent.tool_choice,
    undefined,
    "tool_choice stays auto so real tools remain callable",
  );
  assert(
    typeof sent.system === "string" &&
      sent.system.includes(FINAL_RESULT_TOOL_NAME),
    "system prompt carries the final_result instruction",
  );
});

await test("doGenerate: final_result is unwrapped to text and never surfaced as a tool call", async () => {
  const { client } = mockClient([
    messagesResponse(
      [
        { type: "thinking", thinking: "considering" },
        { type: "text", text: "Here you go:" },
        {
          type: "tool_use",
          id: "tu_1",
          name: FINAL_RESULT_TOOL_NAME,
          input: ENVELOPE_PAYLOAD,
        },
      ],
      "tool_use",
    ),
  ]);
  const model = providerWith(client).getAISDKModel();
  const result = (await (
    model as unknown as { doGenerate: (o: unknown) => Promise<unknown> }
  ).doGenerate(
    generateOptions({
      tools: [SEARCH_TOOL],
      providerOptions: {
        anthropic: { finalResultSchema: ENVELOPE_JSON_SCHEMA },
      },
    }),
  )) as {
    content: Array<{ type: string; text?: string; toolName?: string }>;
    finishReason: { unified: string; raw: string };
  };

  assertEqual(
    result.content.filter((p) => p.type === "tool-call").length,
    0,
    "final_result is filtered out of the returned tool calls",
  );
  const textParts = result.content.filter((p) => p.type === "text");
  assertEqual(textParts.length, 1, "exactly one text part");
  assertEqual(
    textParts[0].text,
    JSON.stringify(ENVELOPE_PAYLOAD),
    "text part is exactly the structured payload (prose preamble dropped)",
  );
  assertEqual(
    result.content.filter((p) => p.type === "reasoning").length,
    1,
    "reasoning blocks are preserved",
  );
  assertEqual(
    result.finishReason.unified,
    "stop",
    "a final_result turn reports a completed turn, not tool-calls",
  );
  assertEqual(
    result.finishReason.raw,
    "tool_use",
    "raw stop_reason stays verbatim",
  );
});

await test("doGenerate: real tool calls still pass through while a schema is active", async () => {
  const { client } = mockClient([
    messagesResponse(
      [
        {
          type: "tool_use",
          id: "tu_1",
          name: "search_docs",
          input: { q: "deploys" },
        },
      ],
      "tool_use",
    ),
  ]);
  const model = providerWith(client).getAISDKModel();
  const result = (await (
    model as unknown as { doGenerate: (o: unknown) => Promise<unknown> }
  ).doGenerate(
    generateOptions({
      tools: [SEARCH_TOOL],
      providerOptions: {
        anthropic: { finalResultSchema: ENVELOPE_JSON_SCHEMA },
      },
    }),
  )) as {
    content: Array<{ type: string; toolName?: string }>;
    finishReason: { unified: string };
  };

  const toolCalls = result.content.filter((p) => p.type === "tool-call");
  assertEqual(toolCalls.length, 1, "the real tool call survives");
  assertEqual(toolCalls[0].toolName, "search_docs", "tool name preserved");
  assertEqual(
    result.finishReason.unified,
    "tool-calls",
    "the agent loop is allowed to continue",
  );
});

await test("doGenerate: schema WITHOUT tools keeps the forced-json path unchanged", async () => {
  const { client, requests } = mockClient([
    messagesResponse(
      [{ type: "tool_use", id: "tu_1", name: "json", input: ENVELOPE_PAYLOAD }],
      "tool_use",
    ),
  ]);
  const model = providerWith(client).getAISDKModel();
  const result = (await (
    model as unknown as { doGenerate: (o: unknown) => Promise<unknown> }
  ).doGenerate(
    generateOptions({
      responseFormat: { type: "json", schema: ENVELOPE_JSON_SCHEMA },
    }),
  )) as { content: Array<{ type: string; text?: string }> };

  const sent = requests[0];
  assertEqual(
    (sent.tools ?? []).map((t) => t.name).join(","),
    "json",
    "still a single forced json tool — no final_result",
  );
  assertEqual(
    sent.tool_choice?.name,
    "json",
    "tool_choice is still pinned to the json tool",
  );
  assertEqual(
    result.content[0]?.text,
    JSON.stringify(ENVELOPE_PAYLOAD),
    "payload still unwrapped into text",
  );
});

await test("doGenerate: no schema leaves the request and the tool calls alone", async () => {
  const { client, requests } = mockClient([
    messagesResponse(
      [
        {
          type: "tool_use",
          id: "tu_1",
          name: "search_docs",
          input: { q: "x" },
        },
      ],
      "tool_use",
    ),
  ]);
  const model = providerWith(client).getAISDKModel();
  const result = (await (
    model as unknown as { doGenerate: (o: unknown) => Promise<unknown> }
  ).doGenerate(generateOptions({ tools: [SEARCH_TOOL] }))) as {
    content: Array<{ type: string; toolName?: string }>;
    finishReason: { unified: string };
  };

  assertEqual(
    (requests[0].tools ?? []).map((t) => t.name).join(","),
    "search_docs",
    "no final_result tool is added",
  );
  assert(
    !String(requests[0].system ?? "").includes(FINAL_RESULT_TOOL_NAME),
    "no final_result instruction is added",
  );
  assertEqual(
    result.content.filter((p) => p.type === "tool-call").length,
    1,
    "tool call passes through",
  );
  assertEqual(
    result.finishReason.unified,
    "tool-calls",
    "finish reason untouched",
  );
});

// ---------------------------------------------------------------------------
// executeStream
// ---------------------------------------------------------------------------

await test("executeStream: schema + tools appends final_result and yields the payload", async () => {
  const { client, requests } = mockClient([
    streamEvents(
      [
        {
          kind: "tool",
          id: "tu_1",
          name: FINAL_RESULT_TOOL_NAME,
          input: JSON.stringify(ENVELOPE_PAYLOAD),
        },
      ],
      "tool_use",
    ),
  ]);
  const provider = providerWith(client);
  const result = await provider.stream({
    input: { text: "summarize" },
    schema: ENVELOPE_SCHEMA,
    tools: { search_docs: { description: "Search", inputSchema: {} } },
    disableTools: false,
  } as never);

  const chunks = await drain(result.stream);
  const sent = requests[0];
  // BaseProvider.stream() merges built-in/MCP tools in, so assert on
  // membership and position rather than on an exact tool list.
  const names = (sent.tools ?? []).map((t) => t.name);
  assertEqual(sent.stream, true, "streaming request");
  assert(names.includes("search_docs"), "the caller's tool is still declared");
  assertEqual(
    names[names.length - 1],
    FINAL_RESULT_TOOL_NAME,
    "final_result is appended LAST",
  );
  assertEqual(
    names.filter((n) => n === FINAL_RESULT_TOOL_NAME).length,
    1,
    "final_result is declared exactly once",
  );
  assertEqual(sent.tool_choice, undefined, "tool_choice stays auto");
  assertEqual(chunks.length, 1, "structured turns deliver exactly one chunk");
  assertEqual(
    chunks[0],
    JSON.stringify(ENVELOPE_PAYLOAD),
    "the chunk is exactly the structured payload",
  );
});

await test("executeStream: prose is still delivered when the model skips final_result", async () => {
  const { client } = mockClient([
    streamEvents(
      [
        { kind: "text", text: "sorry, " },
        { kind: "text", text: "no JSON today" },
      ],
      "end_turn",
    ),
  ]);
  const provider = providerWith(client);
  const result = await provider.stream({
    input: { text: "summarize" },
    schema: ENVELOPE_SCHEMA,
    tools: { search_docs: { description: "Search", inputSchema: {} } },
  } as never);

  const chunks = await drain(result.stream);
  assertEqual(chunks.length, 1, "buffered into a single chunk");
  assertEqual(
    chunks[0],
    "sorry, no JSON today",
    "no text is lost when the model ignores the instruction",
  );
});

await test("executeStream: no schema keeps incremental delivery and adds no tool", async () => {
  const { client, requests } = mockClient([
    streamEvents(
      [
        { kind: "text", text: "chunk one " },
        { kind: "text", text: "chunk two" },
      ],
      "end_turn",
    ),
  ]);
  const provider = providerWith(client);
  const result = await provider.stream({
    input: { text: "hi" },
    tools: { search_docs: { description: "Search", inputSchema: {} } },
  } as never);

  const chunks = await drain(result.stream);
  const names = (requests[0].tools ?? []).map((t) => t.name);
  assert(names.includes("search_docs"), "the caller's tool is still declared");
  assert(
    !names.includes(FINAL_RESULT_TOOL_NAME),
    "no final_result tool is added",
  );
  assert(
    !String(requests[0].system ?? "").includes(FINAL_RESULT_TOOL_NAME),
    "no final_result instruction is added",
  );
  assertEqual(chunks.length, 2, "text deltas still stream incrementally");
});

// ---------------------------------------------------------------------------
// End-to-end: the contract callers actually observe
// ---------------------------------------------------------------------------

await test("generate(): a multi-step schema+tools turn returns parsed structuredData", async () => {
  // Step 1 calls a real tool; step 2 answers with final_result. This is the
  // production shape: before the fix the schema was dropped entirely and the
  // turn came back as prose.
  const { client, requests } = mockClient([
    messagesResponse(
      [{ type: "tool_use", id: "t1", name: "lookup", input: { q: "x" } }],
      "tool_use",
    ),
    messagesResponse(
      [
        {
          type: "tool_use",
          id: "t2",
          name: FINAL_RESULT_TOOL_NAME,
          input: ENVELOPE_PAYLOAD,
        },
      ],
      "tool_use",
    ),
  ]);
  const result = await providerWith(client).generate({
    input: { text: "summarize the deploy" },
    schema: ENVELOPE_SCHEMA,
    tools: {
      lookup: {
        description: "Look something up",
        inputSchema: z.object({ q: z.string() }),
        execute: async () => ({ found: true }),
      },
    },
    maxSteps: 5,
  } as never);

  assertEqual(requests.length, 2, "the agent loop ran both steps");
  const step2Tools = (requests[1].tools ?? []).map((t) => t.name);
  assert(step2Tools.includes("lookup"), "the real tool stayed callable");
  assertEqual(
    step2Tools[step2Tools.length - 1],
    FINAL_RESULT_TOOL_NAME,
    "final_result declared last on every step",
  );
  assertEqual(requests[1].tool_choice, undefined, "tool_choice stays auto");

  assertEqual(
    result?.content,
    JSON.stringify(ENVELOPE_PAYLOAD),
    "content is the structured payload",
  );
  assertEqual(
    JSON.stringify(result?.structuredData),
    JSON.stringify(ENVELOPE_PAYLOAD),
    "structuredData is the parsed object — the whole point of the fix",
  );
  assertEqual(
    (result?.toolsUsed ?? []).join(","),
    "lookup",
    "final_result is filtered out of toolsUsed; the real tool is reported",
  );
  assertEqual(
    (result?.toolCalls ?? []).filter(
      (tc) => tc.toolName === FINAL_RESULT_TOOL_NAME,
    ).length,
    0,
    "final_result never appears in toolCalls",
  );
  assertEqual(
    (result?.toolExecutions ?? []).filter(
      (te) => te.toolName === FINAL_RESULT_TOOL_NAME,
    ).length,
    0,
    "final_result never appears in toolExecutions",
  );
  assertEqual(result?.finishReason, "stop", "turn reports a clean finish");
});

// ---------------------------------------------------------------------------
// GenerationHandler → providerOptions channel
// ---------------------------------------------------------------------------

/**
 * Run one generation through GenerationHandler with `generateText` stubbed,
 * and return the providerOptions the handler built.
 */
async function capturedProviderOptions(
  providerName: string,
  options: Record<string, unknown>,
  tools: Record<string, unknown>,
): Promise<Record<string, Record<string, unknown>> | undefined> {
  let captured: Record<string, Record<string, unknown>> | undefined;
  const handler = new GenerationHandler(
    providerName as never,
    "claude-sonnet-4-6",
    () => true,
    () => undefined,
    async () => {},
    {
      generateTextFn: (async (args: Record<string, unknown>) => {
        captured = args.providerOptions as
          | Record<string, Record<string, unknown>>
          | undefined;
        return {
          text: "{}",
          finishReason: "stop",
          usage: { inputTokens: 1, outputTokens: 1 },
          steps: [],
          toolCalls: [],
        };
      }) as never,
    },
  );
  await handler.executeGeneration(
    { modelId: "claude-sonnet-4-6", provider: providerName } as never,
    [{ role: "user", content: "hi" }] as never,
    tools as never,
    options as never,
  );
  return captured;
}

await test("GenerationHandler hands the JSON Schema to the anthropic provider", async () => {
  const captured = await capturedProviderOptions(
    "anthropic",
    { schema: ENVELOPE_SCHEMA },
    { search_docs: { description: "Search", inputSchema: {} } },
  );
  const schema = captured?.anthropic?.finalResultSchema as
    | Record<string, unknown>
    | undefined;
  assert(schema !== undefined, "finalResultSchema is forwarded");
  assertEqual(
    Object.keys((schema?.properties ?? {}) as Record<string, unknown>)
      .sort()
      .join(","),
    "attachment,blocks,summary",
    "the forwarded schema is the caller's schema",
  );
});

await test("GenerationHandler withholds the schema where the pattern must not run", async () => {
  const noTools = await capturedProviderOptions(
    "anthropic",
    { schema: ENVELOPE_SCHEMA },
    {},
  );
  assertEqual(
    noTools?.anthropic,
    undefined,
    "no tools → the forced-json path handles it, no final_result",
  );

  const noSchema = await capturedProviderOptions(
    "anthropic",
    {},
    {
      search_docs: { description: "Search", inputSchema: {} },
    },
  );
  assertEqual(noSchema?.anthropic, undefined, "no schema → nothing forwarded");

  // Vertex+Claude and Gemini have their own native handling; bedrock runs on
  // the third-party @ai-sdk/amazon-bedrock model, which cannot read this.
  for (const provider of ["vertex", "bedrock", "google-ai"]) {
    const other = await capturedProviderOptions(
      provider,
      { schema: ENVELOPE_SCHEMA },
      { search_docs: { description: "Search", inputSchema: {} } },
    );
    assertEqual(
      other?.anthropic,
      undefined,
      `${provider} → nothing forwarded on the anthropic channel`,
    );
  }
});

await runSuite();
