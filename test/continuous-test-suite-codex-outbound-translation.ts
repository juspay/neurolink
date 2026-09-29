#!/usr/bin/env tsx
/** Determinism exception: pure request-shape translation (Codex Responses ->
 * ClaudeRequest) proven against fixed fixture bodies; a live model cannot be
 * made to emit a specific malformed/duck-typed request on demand, and cache-
 * breakpoint/tool-order determinism needs byte-identical repeated runs over
 * the same input, which a live call cannot guarantee either. Imports only the
 * isolated `src/` module graph, mirroring
 * `test/continuous-test-suite-vertex-anthropic-fallback.ts`. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  parseCodexNativeRequest,
  translateCodexRequestToClaude,
} from "../src/lib/proxy/codexOutboundFallback.js";
import { applyClaudeRequestCacheBreakpoints } from "../src/lib/utils/anthropicCacheBreakpoints.js";
import type {
  ClaudeTextBlock,
  ClaudeToolResultBlock,
  ClaudeToolUseBlock,
  CodexNativeInputItem,
  CodexNativeRequest,
  CodexReasoningEffort,
  CodexTranslationError,
} from "../src/lib/types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "fixtures");

const FIXTURE_FILES = [
  "codex-request-exec-mode.json",
  "codex-request-interactive-mode.json",
  "codex-request-resumed-session.json",
  "codex-request-tool-result-turn.json",
  "codex-request-parallel-tool-calls.json",
] as const;

function readFixtureBody(file: string): unknown {
  const raw = readFileSync(path.join(FIXTURES_DIR, file), "utf8");
  const parsed = JSON.parse(raw) as { body: unknown };
  return parsed.body;
}

const TARGET = { provider: "anthropic" as const, model: "claude-sonnet-5" };

function assertOkTranslate(body: unknown) {
  const parsed = parseCodexNativeRequest(body);
  if (!parsed.ok) {
    throw new Error(
      `parse failed: ${parsed.error.code} ${parsed.error.message}`,
    );
  }
  const translated = translateCodexRequestToClaude(parsed.value, TARGET);
  if (!translated.ok) {
    throw new Error(
      `translate failed: ${translated.error.code} ${translated.error.message}`,
    );
  }
  return translated.value;
}

function minimalRequest(
  overrides: Partial<CodexNativeRequest> = {},
): CodexNativeRequest {
  return {
    model: "gpt-5-codex",
    stream: true,
    store: false,
    input: [
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "hi" }],
      },
    ],
    ...overrides,
  };
}

function userMessage(text: string): CodexNativeInputItem {
  return {
    type: "message",
    role: "user",
    content: [{ type: "input_text", text }],
  };
}

function additionalTools(names: string[]): CodexNativeInputItem {
  return {
    type: "additional_tools",
    role: "developer",
    tools: [
      {
        type: "namespace",
        name: "functions",
        description: "test tools",
        tools: names.map((name) => ({
          type: "function" as const,
          name,
          strict: false,
          parameters: { type: "object", properties: {} },
        })),
      },
    ],
  };
}

function translateError(
  request: CodexNativeRequest,
): CodexTranslationError["code"] | undefined {
  const result = translateCodexRequestToClaude(request, TARGET);
  return result.ok ? undefined : result.error.code;
}

let passed = 0;
function test(name: string, run: () => void) {
  run();
  passed++;
  console.log(`PASS ${name}`);
}

test("parseCodexNativeRequest rejects a body missing input", () => {
  const result = parseCodexNativeRequest({
    model: "gpt-5-codex",
    stream: true,
    store: false,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "MALFORMED_REQUEST");
  }
});

test("parseCodexNativeRequest accepts all 5 fixture bodies", () => {
  for (const file of FIXTURE_FILES) {
    const body = readFixtureBody(file);
    const result = parseCodexNativeRequest(body);
    assert.equal(result.ok, true, `${file} should parse ok`);
  }
});

test("translateCodexRequestToClaude is deterministic across repeated runs", () => {
  for (const file of FIXTURE_FILES) {
    const body = readFixtureBody(file);
    const parsed = parseCodexNativeRequest(body);
    assert.equal(parsed.ok, true, `${file} should parse ok`);
    if (!parsed.ok) {
      continue;
    }
    const first = translateCodexRequestToClaude(parsed.value, TARGET);
    const second = translateCodexRequestToClaude(parsed.value, TARGET);
    assert.equal(first.ok, true, `${file} should translate ok`);
    assert.equal(second.ok, true, `${file} should translate ok`);
    assert.equal(
      JSON.stringify(first),
      JSON.stringify(second),
      `${file} translation must be deterministic`,
    );
  }
});

test("system is always ClaudeTextBlock[], never a string", () => {
  for (const file of FIXTURE_FILES) {
    const claudeRequest = assertOkTranslate(readFixtureBody(file));
    if (claudeRequest.system !== undefined) {
      assert.equal(
        Array.isArray(claudeRequest.system),
        true,
        `${file}'s system must be an array`,
      );
    }
  }
});

test("interactive-mode: consecutive user items coalesce; mixed-kind tools split correctly", () => {
  const rawBody = readFixtureBody("codex-request-interactive-mode.json") as {
    input: Array<{
      type: string;
      role?: string;
      content?: unknown[];
      tools?: Array<{ tools: Array<Record<string, unknown>> }>;
    }>;
  };
  const claudeRequest = assertOkTranslate(rawBody);

  const userMessages = claudeRequest.messages.filter((m) => m.role === "user");
  assert.equal(
    userMessages.length,
    1,
    "the two consecutive user items must coalesce into one message",
  );
  const content = userMessages[0]!.content;
  assert.equal(Array.isArray(content), true);
  assert.equal(
    (content as unknown[]).length,
    2,
    "coalesced user message must carry both text blocks",
  );

  const additionalTools = rawBody.input.find(
    (i) => i.type === "additional_tools",
  );
  assert.ok(additionalTools, "fixture must carry an additional_tools item");
  const rawCustom = additionalTools!
    .tools!.flatMap((ns) => ns.tools)
    .find((t) => t.type === "custom") as { name: string };
  const rawFunction = additionalTools!
    .tools!.flatMap((ns) => ns.tools)
    .find((t) => t.type === "function") as {
    name: string;
    parameters: Record<string, unknown>;
  };

  const claudeTools = claudeRequest.tools ?? [];
  const customTool = claudeTools.find((t) => t.name === rawCustom.name);
  const functionTool = claudeTools.find((t) => t.name === rawFunction.name);
  assert.ok(customTool, "custom-kind tool must be mapped");
  assert.ok(functionTool, "function-kind tool must be mapped");
  assert.deepEqual(
    customTool!.input_schema,
    {
      type: "object",
      properties: {
        input: {
          type: "string",
          description:
            "Raw command text, constrained by the grammar in this tool's description.",
        },
      },
      required: ["input"],
    },
    "custom tool must use the single-input fallback schema",
  );
  assert.deepEqual(
    functionTool!.input_schema,
    rawFunction.parameters,
    "function tool's input_schema must equal its original parameters byte-for-byte",
  );
});

test("parallel-tool-calls: 2 function_calls group into one assistant message with 2 tool_use blocks", () => {
  const claudeRequest = assertOkTranslate(
    readFixtureBody("codex-request-parallel-tool-calls.json"),
  );
  const assistantMessages = claudeRequest.messages.filter(
    (m) => m.role === "assistant",
  );
  assert.equal(assistantMessages.length, 1);
  const toolUseBlocks = (
    assistantMessages[0]!.content as ClaudeToolUseBlock[]
  ).filter((b) => b.type === "tool_use");
  assert.equal(toolUseBlocks.length, 2);
  assert.equal(toolUseBlocks[0]!.id, "call_synthetic_0001");
  assert.equal(toolUseBlocks[1]!.id, "call_synthetic_0002");
  assert.deepEqual(toolUseBlocks[0]!.input, { input: "ls -la" });
  assert.deepEqual(toolUseBlocks[1]!.input, { path: "src/index.ts" });

  const userMessages = claudeRequest.messages.filter((m) => m.role === "user");
  const toolResultMessage = userMessages[userMessages.length - 1]!;
  const toolResultBlocks = (
    toolResultMessage.content as ClaudeToolResultBlock[]
  ).filter((b) => b.type === "tool_result");
  assert.equal(toolResultBlocks.length, 2);
  assert.equal(toolResultBlocks[0]!.tool_use_id, "call_synthetic_0001");
  assert.equal(toolResultBlocks[1]!.tool_use_id, "call_synthetic_0002");
});

test("tool-result-turn: non-JSON exec arguments translate without throwing", () => {
  const claudeRequest = assertOkTranslate(
    readFixtureBody("codex-request-tool-result-turn.json"),
  );
  const assistantMessage = claudeRequest.messages.find(
    (m) => m.role === "assistant",
  )!;
  const toolUse = (assistantMessage.content as ClaudeToolUseBlock[]).find(
    (b) => b.type === "tool_use",
  )!;
  assert.deepEqual(toolUse.input, { input: "ls -la" });
});

test("input_image content parts: data URI maps to base64, http(s) maps to url", () => {
  const dataUriRequest = minimalRequest({
    input: [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_image", image_url: "data:image/png;base64,QUJD" },
        ],
      },
    ],
  });
  const dataUriResult = translateCodexRequestToClaude(dataUriRequest, TARGET);
  assert.equal(dataUriResult.ok, true);
  if (dataUriResult.ok) {
    assert.deepEqual(dataUriResult.value.messages[0]!.content, [
      {
        type: "image",
        source: { type: "base64", media_type: "image/png", data: "QUJD" },
      },
    ]);
  }

  const urlRequest = minimalRequest({
    input: [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_image", image_url: "https://example.com/x.png" },
        ],
      },
    ],
  });
  const urlResult = translateCodexRequestToClaude(urlRequest, TARGET);
  assert.equal(urlResult.ok, true);
  if (urlResult.ok) {
    assert.deepEqual(urlResult.value.messages[0]!.content, [
      {
        type: "image",
        source: { type: "url", url: "https://example.com/x.png" },
      },
    ]);
  }
});

test("tool_choice table produces the exact §3.3 shape for each case", () => {
  const cases: Array<[CodexNativeRequest["tool_choice"], unknown]> = [
    ["required", { type: "any" }],
    [
      { type: "function", name: "x" },
      { type: "tool", name: "x" },
    ],
    ["auto", { type: "auto" }],
    ["none", { type: "none" }],
    // Tool-call-fidelity PR: an absent tool_choice now defaults explicitly to
    // {type:"auto"} (previously omitted entirely), so
    // disable_parallel_tool_use always has a field to attach to regardless of
    // whether the source request bothered to say "auto" out loud — see the
    // spec's corrected §2 bijection table and its tool_choice_absent_defaults_auto
    // test. This row is a deliberate behavior change, not a regression.
    [undefined, { type: "auto" }],
  ];
  for (const [choice, expected] of cases) {
    const result = translateCodexRequestToClaude(
      minimalRequest({
        tool_choice: choice,
        input: [additionalTools(["x"]), userMessage("hi")],
      }),
      TARGET,
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(
        result.value.tool_choice,
        expected,
        `choice=${JSON.stringify(choice)}`,
      );
    }
  }
});

test("reasoning.effort table produces the exact §3.5 shape or omission", () => {
  const cases: Array<[string, unknown]> = [
    ["none", undefined],
    ["minimal", undefined],
    ["low", { type: "enabled", budget_tokens: 4096 }],
    ["medium", { type: "enabled", budget_tokens: 8192 }],
    ["high", { type: "enabled", budget_tokens: 16384 }],
    ["xhigh", { type: "enabled", budget_tokens: 24576 }],
    ["max", { type: "enabled", budget_tokens: 32768 }],
  ];
  for (const [effort, expected] of cases) {
    const result = translateCodexRequestToClaude(
      minimalRequest({
        reasoning: { effort: effort as CodexReasoningEffort },
      }),
      TARGET,
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value.thinking, expected, `effort=${effort}`);
    }
  }
});

test("reasoning budget stays within [1024, ceiling - 1024] under the smallest real ceiling", () => {
  // "claude-3-5-haiku" resolves to getClaudeMaxOutputTokens's 8192 ceiling —
  // the smallest any real model name reaches — so resolvedMaxTokens - 1024
  // = 7168, and the "max" effort's 32768 table entry gets clamped down to
  // it. No real model name drives the ceiling low enough to hit the
  // Math.max(1024, ...) floor itself (the lowest path, 4096, still leaves
  // 3072 of headroom) — the design's own §3.5 notes this floor is "not a
  // guarantee this formula enforced" by today's model table, only insurance
  // against a future one. This asserts the reachable half of the clamp
  // formula through the public surface; the floor's own arithmetic
  // (Math.max(1024, ...)) is exercised structurally by the code, not by a
  // reachable end-to-end case.
  const result = translateCodexRequestToClaude(
    minimalRequest({ reasoning: { effort: "max" } }),
    { provider: "anthropic", model: "claude-3-5-haiku" },
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    const thinking = result.value.thinking as
      | { type: string; budget_tokens: number }
      | undefined;
    assert.ok(thinking);
    assert.equal(thinking!.budget_tokens, 7168);
    assert.ok(
      thinking!.budget_tokens >= 1024,
      "budget_tokens must never drop below 1024",
    );
    assert.ok(
      thinking!.budget_tokens <= result.value.max_tokens - 1024,
      "budget_tokens must leave at least 1024 tokens of headroom under max_tokens",
    );
  }
});

test("resumed session missing the fresh-session preamble fails loud, not silent", () => {
  const rawBody = readFixtureBody("codex-request-resumed-session.json") as {
    input: unknown[];
  };
  const parsed = parseCodexNativeRequest(rawBody);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  const intact = translateCodexRequestToClaude(parsed.value, TARGET);
  assert.equal(
    intact.ok,
    true,
    "unmodified fixture (with preamble) must translate ok",
  );

  const withoutPreamble = {
    ...parsed.value,
    input: parsed.value.input.slice(1),
  };
  const mutated = translateCodexRequestToClaude(withoutPreamble, TARGET);
  assert.equal(mutated.ok, false);
  if (!mutated.ok) {
    assert.equal(mutated.error.code, "SUSPECTED_PARTIAL_HISTORY");
  }
});

test("cache breakpoint lands on the last system block, not the last tool", () => {
  const claudeRequest = assertOkTranslate(
    readFixtureBody("codex-request-interactive-mode.json"),
  );
  const withBreakpoints = applyClaudeRequestCacheBreakpoints(claudeRequest);
  const system = withBreakpoints.system as ClaudeTextBlock[];
  assert.ok(Array.isArray(system) && system.length > 0);
  const lastSystemBlock = system[system.length - 1]!;
  assert.ok(
    lastSystemBlock.cache_control,
    "the last system block must carry the cache breakpoint marker",
  );
  const tools = withBreakpoints.tools ?? [];
  for (const tool of tools) {
    assert.equal(
      tool.cache_control,
      undefined,
      "no tool should carry a cache breakpoint when system is present",
    );
  }
});

test("custom_tool_call history maps to tool_use {input} and its output to tool_result", () => {
  const result = translateCodexRequestToClaude(
    minimalRequest({
      input: [
        userMessage("list files"),
        {
          type: "custom_tool_call",
          call_id: "call_custom_0001",
          name: "exec",
          input: "ls -la",
        },
        {
          type: "custom_tool_call_output",
          call_id: "call_custom_0001",
          output: "total 0",
        },
      ],
    }),
    TARGET,
  );
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  const [, assistant, toolResultTurn] = result.value.messages;
  assert.deepEqual(assistant!.content, [
    {
      type: "tool_use",
      id: "call_custom_0001",
      name: "exec",
      input: { input: "ls -la" },
    },
  ]);
  assert.deepEqual(toolResultTurn!.content, [
    {
      type: "tool_result",
      tool_use_id: "call_custom_0001",
      content: "total 0",
    },
  ]);
});

test("reasoning items parse and are dropped; an unknown item type still fails parsing", () => {
  const withReasoning = {
    ...minimalRequest(),
    input: [
      userMessage("hi"),
      { type: "reasoning", encrypted_content: "gAAAAB...", summary: [] },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "hello" }],
      },
      userMessage("again"),
    ],
  };
  const parsed = parseCodexNativeRequest(withReasoning);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }
  const translated = translateCodexRequestToClaude(parsed.value, TARGET);
  assert.equal(translated.ok, true);
  if (translated.ok) {
    assert.deepEqual(
      translated.value.messages.map((message) => message.role),
      ["user", "assistant", "user"],
    );
  }

  const unknown = parseCodexNativeRequest({
    ...minimalRequest(),
    input: [userMessage("hi"), { type: "web_search_call", id: "ws_1" }],
  });
  assert.equal(unknown.ok, false);
  if (!unknown.ok) {
    assert.equal(unknown.error.code, "MALFORMED_REQUEST");
  }
});

test("a history that does not open with a user turn is untranslatable", () => {
  assert.equal(
    translateError(
      minimalRequest({
        input: [
          { type: "function_call", call_id: "c1", name: "x", arguments: "{}" },
          { type: "function_call_output", call_id: "c1", output: "done" },
        ],
      }),
    ),
    "UNTRANSLATABLE_REQUEST",
  );
  assert.equal(
    translateError(minimalRequest({ input: [] })),
    "UNTRANSLATABLE_REQUEST",
  );
});

test("an empty message is skipped rather than sent as a content-less turn", () => {
  const result = translateCodexRequestToClaude(
    minimalRequest({
      input: [
        userMessage("hi"),
        { type: "message", role: "assistant", content: [] },
        userMessage("again"),
      ],
    }),
    TARGET,
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.messages.length, 1);
    assert.equal((result.value.messages[0]!.content as unknown[]).length, 2);
  }
});

test("thinking is left off when tool_choice forces a tool", () => {
  const result = translateCodexRequestToClaude(
    minimalRequest({
      reasoning: { effort: "high" },
      tool_choice: "required",
      input: [additionalTools(["x"]), userMessage("hi")],
    }),
    TARGET,
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value.tool_choice, { type: "any" });
    assert.equal(result.value.thinking, undefined);
  }
});

test("thinking is left off when the last assistant turn calls a tool, kept otherwise", () => {
  const parsed = parseCodexNativeRequest({
    ...(readFixtureBody("codex-request-tool-result-turn.json") as object),
    reasoning: { effort: "high" },
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }
  const toolTurn = translateCodexRequestToClaude(parsed.value, TARGET);
  assert.equal(toolTurn.ok, true);
  if (toolTurn.ok) {
    assert.equal(toolTurn.value.thinking, undefined);
  }

  const plainTurn = translateCodexRequestToClaude(
    minimalRequest({ reasoning: { effort: "high" } }),
    TARGET,
  );
  assert.equal(plainTurn.ok, true);
  if (plainTurn.ok) {
    assert.deepEqual(plainTurn.value.thinking, {
      type: "enabled",
      budget_tokens: 16384,
    });
  }
});

test("tool_choice without tools: forcing or naming is malformed, auto is omitted", () => {
  assert.equal(
    translateError(minimalRequest({ tool_choice: "required" })),
    "MALFORMED_REQUEST",
  );
  assert.equal(
    translateError(
      minimalRequest({
        tool_choice: { type: "function", name: "missing" },
        input: [additionalTools(["x"]), userMessage("hi")],
      }),
    ),
    "MALFORMED_REQUEST",
  );
  const auto = translateCodexRequestToClaude(
    minimalRequest({ tool_choice: "auto" }),
    TARGET,
  );
  assert.equal(auto.ok, true);
  if (auto.ok) {
    assert.equal(auto.value.tool_choice, undefined);
  }
});

test("a forced tool_choice degrades to auto for a target that rejects it (Sonnet 5.5, Opus 5.5), and is unaffected for other targets", () => {
  const REJECTING_TARGETS = ["claude-sonnet-5-5", "claude-opus-5-5"] as const;
  for (const model of REJECTING_TARGETS) {
    const required = translateCodexRequestToClaude(
      minimalRequest({
        tool_choice: "required",
        input: [additionalTools(["x"]), userMessage("hi")],
      }),
      { provider: "anthropic", model },
    );
    assert.equal(required.ok, true, `model=${model}`);
    if (required.ok) {
      assert.deepEqual(
        required.value.tool_choice,
        { type: "auto" },
        `model=${model} tool_choice:"required" must degrade to auto`,
      );
    }

    const named = translateCodexRequestToClaude(
      minimalRequest({
        tool_choice: { type: "function", name: "x" },
        parallel_tool_calls: false,
        input: [additionalTools(["x"]), userMessage("hi")],
      }),
      { provider: "anthropic", model },
    );
    assert.equal(named.ok, true, `model=${model}`);
    if (named.ok) {
      assert.deepEqual(
        named.value.tool_choice,
        { type: "auto", disable_parallel_tool_use: true },
        `model=${model} named tool_choice must degrade to auto, keeping disable_parallel_tool_use`,
      );
    }
  }

  // Other targets (the suite's default TARGET, claude-sonnet-5) are
  // unaffected — already proven by "tool_choice table produces the exact
  // §3.3 shape for each case" above, which sends "required" straight
  // through as {type:"any"} against TARGET.
  const unaffected = translateCodexRequestToClaude(
    minimalRequest({
      tool_choice: "required",
      input: [additionalTools(["x"]), userMessage("hi")],
    }),
    TARGET,
  );
  assert.equal(unaffected.ok, true);
  if (unaffected.ok) {
    assert.deepEqual(unaffected.value.tool_choice, { type: "any" });
  }
});

test("thinking-off degrades per target for a Codex effort of none/minimal: between_tools for Sonnet 5.5, omitted for Opus 5.5, omitted (unchanged) for other targets", () => {
  for (const effort of ["none", "minimal"] as const) {
    const sonnet55 = translateCodexRequestToClaude(
      minimalRequest({ reasoning: { effort } }),
      { provider: "anthropic", model: "claude-sonnet-5-5" },
    );
    assert.equal(sonnet55.ok, true, `effort=${effort}`);
    if (sonnet55.ok) {
      assert.deepEqual(
        sonnet55.value.thinking,
        { type: "between_tools" },
        `claude-sonnet-5-5 effort=${effort} must send thinking:{type:"between_tools"}, never {type:"disabled"}`,
      );
    }

    const opus55 = translateCodexRequestToClaude(
      minimalRequest({ reasoning: { effort } }),
      { provider: "anthropic", model: "claude-opus-5-5" },
    );
    assert.equal(opus55.ok, true, `effort=${effort}`);
    if (opus55.ok) {
      assert.equal(
        opus55.value.thinking,
        undefined,
        `claude-opus-5-5 effort=${effort} has no off-state to request; thinking must stay omitted, never {type:"disabled"}`,
      );
    }

    const unaffected = translateCodexRequestToClaude(
      minimalRequest({ reasoning: { effort } }),
      TARGET,
    );
    assert.equal(unaffected.ok, true, `effort=${effort}`);
    if (unaffected.ok) {
      assert.equal(
        unaffected.value.thinking,
        undefined,
        `${TARGET.model} effort=${effort} is an unaffected target and keeps its historical omitted thinking`,
      );
    }
  }

  // A named/forced tool_choice sent to Sonnet 5.5 degrades to {type:"auto"}
  // (proven above), which is not one of the two shapes
  // (forced/tool-using-last-turn) the Messages API rejects thinking on — so
  // the between_tools degradation still applies on top of it.
  const namedOnSonnet55 = translateCodexRequestToClaude(
    minimalRequest({
      reasoning: { effort: "none" },
      tool_choice: { type: "function", name: "x" },
      input: [additionalTools(["x"]), userMessage("hi")],
    }),
    { provider: "anthropic", model: "claude-sonnet-5-5" },
  );
  assert.equal(namedOnSonnet55.ok, true);
  if (namedOnSonnet55.ok) {
    assert.deepEqual(
      namedOnSonnet55.value.tool_choice,
      { type: "auto" },
      "the named tool_choice degrades to auto for this target",
    );
    assert.deepEqual(
      namedOnSonnet55.value.thinking,
      { type: "between_tools" },
      "auto is not a forced tool_choice, so the between_tools degradation still applies",
    );
  }

  // A tool_choice this target DOES support forcing (none) still suppresses
  // thinking entirely via the unrelated Messages-API-wide rule: the last
  // assistant turn having called a tool. Prove the family-based degradation
  // never overrides that unrelated suppression.
  const parsedToolTurn = parseCodexNativeRequest({
    ...(readFixtureBody("codex-request-tool-result-turn.json") as object),
    reasoning: { effort: "none" },
  });
  assert.equal(parsedToolTurn.ok, true);
  if (parsedToolTurn.ok) {
    const toolTurnOnSonnet55 = translateCodexRequestToClaude(
      parsedToolTurn.value,
      { provider: "anthropic", model: "claude-sonnet-5-5" },
    );
    assert.equal(toolTurnOnSonnet55.ok, true);
    if (toolTurnOnSonnet55.ok) {
      assert.equal(
        toolTurnOnSonnet55.value.thinking,
        undefined,
        "a tool-using last assistant turn suppresses thinking outright, regardless of target model family",
      );
    }
  }
});

test("images the Messages API cannot take are untranslatable; image/jpg normalizes to image/jpeg", () => {
  const withImage = (image_url: string, role: "user" | "developer" = "user") =>
    minimalRequest({
      input: [
        {
          type: "message",
          role,
          content: [{ type: "input_image", image_url }],
        },
        userMessage("describe it"),
      ],
    });
  assert.equal(
    translateError(withImage("data:image/svg+xml;base64,PHN2Zy8+")),
    "UNTRANSLATABLE_REQUEST",
  );
  assert.equal(
    translateError(withImage("data:image/png,raw-not-base64")),
    "UNTRANSLATABLE_REQUEST",
  );
  assert.equal(
    translateError(withImage("data:image/png;base64,QUJD", "developer")),
    "UNTRANSLATABLE_REQUEST",
  );
  const jpg = translateCodexRequestToClaude(
    withImage("data:image/jpg;base64,QUJD"),
    TARGET,
  );
  assert.equal(jpg.ok, true);
  if (jpg.ok) {
    const [image] = jpg.value.messages[0]!.content as Array<{
      source: { media_type?: string };
    }>;
    assert.equal(image!.source.media_type, "image/jpeg");
  }
});

test("a tool name the Messages API rejects is untranslatable", () => {
  assert.equal(
    translateError(
      minimalRequest({
        input: [additionalTools(["server.tool"]), userMessage("hi")],
      }),
    ),
    "UNTRANSLATABLE_REQUEST",
  );
});

test("when several additional_tools items appear, the last one wins", () => {
  const result = translateCodexRequestToClaude(
    minimalRequest({
      input: [
        additionalTools(["first_tool"]),
        userMessage("hi"),
        additionalTools(["second_tool"]),
      ],
    }),
    TARGET,
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(
      (result.value.tools ?? []).map((tool) => tool.name),
      ["second_tool"],
    );
  }
});

test("broken tool call/result pairing is untranslatable, not sent", () => {
  assert.equal(
    translateError(
      minimalRequest({
        input: [
          userMessage("hi"),
          { type: "function_call_output", call_id: "c9", output: "orphan" },
        ],
      }),
    ),
    "UNTRANSLATABLE_REQUEST",
  );
  assert.equal(
    translateError(
      minimalRequest({
        input: [
          userMessage("hi"),
          { type: "function_call", call_id: "c1", name: "x", arguments: "{}" },
          userMessage("never answered"),
        ],
      }),
    ),
    "UNTRANSLATABLE_REQUEST",
  );
});

test("a user message between a call and its output lands after the tool_result", () => {
  const result = translateCodexRequestToClaude(
    minimalRequest({
      input: [
        userMessage("run it"),
        { type: "function_call", call_id: "c1", name: "x", arguments: "{}" },
        userMessage("note"),
        { type: "function_call_output", call_id: "c1", output: "done" },
      ],
    }),
    TARGET,
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    const last = result.value.messages[2]!.content as Array<{ type: string }>;
    assert.deepEqual(
      last.map((block) => block.type),
      ["tool_result", "text"],
    );
  }
});

// PR 4 gap #2 (carry-ins): tool-declaration order must survive flattening
// across multiple namespaces — buildClaudeTools must map over the native
// array directly (namespace order, then tool order within it), never stage
// through a Record<string, Tool> that could reorder or dedupe by key.
test("tool declaration order is preserved across multiple namespaces: namespace order, then tool order within each namespace", () => {
  const request = minimalRequest({
    input: [
      {
        type: "additional_tools",
        role: "developer",
        tools: [
          {
            type: "namespace",
            name: "functions",
            description: "test tools",
            tools: [
              {
                type: "function",
                name: "read_file",
                strict: false,
                parameters: { type: "object", properties: {} },
              },
              {
                type: "custom",
                name: "exec",
                description: "run a shell command",
                format: {
                  type: "grammar",
                  syntax: "lark",
                  definition: "start: /.*/",
                },
              },
            ],
          },
          {
            type: "namespace",
            name: "collaboration",
            description: "test tools",
            tools: [
              {
                type: "function",
                name: "spawn_agent",
                strict: false,
                parameters: { type: "object", properties: {} },
              },
              {
                type: "function",
                name: "send_message",
                strict: false,
                parameters: { type: "object", properties: {} },
              },
            ],
          },
        ],
      },
      userMessage("hi"),
    ],
  });
  const result = translateCodexRequestToClaude(request, TARGET);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(
      (result.value.tools ?? []).map((tool) => tool.name),
      ["read_file", "exec", "spawn_agent", "send_message"],
      "tool order must exactly match the declared namespace-then-tool order, not be resorted or grouped by kind",
    );
  }
});

// PR 4 gap (carry-ins): a developer message landing between a tool call and
// its result must neither break the call/result adjacency the Messages API
// requires nor be dropped from the system text it feeds.
test("a developer message between a tool call and its result reaches system text and does not break call/result pairing", () => {
  const request = minimalRequest({
    input: [
      userMessage("run it"),
      {
        type: "function_call",
        call_id: "call_1",
        name: "read_file",
        arguments: "{}",
      },
      {
        type: "message",
        role: "developer",
        content: [{ type: "input_text", text: "mid-turn developer note" }],
      },
      {
        type: "function_call_output",
        call_id: "call_1",
        output: "file contents",
      },
    ],
  });
  const result = translateCodexRequestToClaude(request, TARGET);
  assert.equal(result.ok, true);
  if (result.ok) {
    const system = result.value.system ?? [];
    const systemText =
      typeof system === "string"
        ? system
        : system.map((block) => block.text).join("\n");
    assert.ok(
      systemText.includes("mid-turn developer note"),
      "the interleaved developer message must still reach system text",
    );

    const roles = result.value.messages.map((m) => m.role);
    assert.deepEqual(
      roles,
      ["user", "assistant", "user"],
      "the developer message must not insert an extra turn or split the call from its result",
    );
    const assistantContent = result.value.messages[1]!.content;
    assert.equal(Array.isArray(assistantContent), true);
    assert.deepEqual(
      (assistantContent as Array<{ type: string }>).map((b) => b.type),
      ["tool_use"],
      "the assistant turn must still carry exactly the tool_use block, undisturbed",
    );
    const resultContent = result.value.messages[2]!.content;
    assert.deepEqual(
      (resultContent as Array<{ type: string }>).map((b) => b.type),
      ["tool_result"],
      "the tool call must still be answered in the very next user turn",
    );
  }
});

// PR 4 gap #26 (carry-ins): a characterization test built from a REDACTED
// copy of the real ~/.neurolink/reference/codex-cli-wire-sample.json capture
// (see test/fixtures/codex-cli-wire-sample-redacted.json and its own `note`
// field for provenance). Every id/token/path/email in the original was
// stripped or replaced with a placeholder before this fixture was written;
// see the redaction script referenced in the PR body. What survives, and
// what this test exists to prove, is the real capture's structural shape:
// `exec` (a type:"custom" grammar tool) lives inside the `functions`
// namespace, not `collaboration` — disproving the assumption that namespace
// name implies tool kind, which is why mapCodexToolDeclarationToClaude
// switches on each declaration's own `type` field, never on which namespace
// it was found in.
test("live-capture characterization (redacted): a real capture's exec (custom/grammar) tool lives in the functions namespace, not collaboration, and still translates", () => {
  const raw = readFileSync(
    path.join(FIXTURES_DIR, "codex-cli-wire-sample-redacted.json"),
    "utf8",
  );
  const capture = JSON.parse(raw) as { body: { input: unknown[] } };
  const additionalToolsItem = capture.body.input[0] as {
    type: string;
    tools: Array<{ name: string; tools: Array<Record<string, unknown>> }>;
  };
  assert.equal(additionalToolsItem.type, "additional_tools");
  const functionsNamespace = additionalToolsItem.tools.find(
    (ns) => ns.name === "functions",
  );
  const collaborationNamespace = additionalToolsItem.tools.find(
    (ns) => ns.name === "collaboration",
  );
  assert.ok(functionsNamespace, "capture must carry a functions namespace");
  assert.ok(
    collaborationNamespace,
    "capture must carry a collaboration namespace",
  );
  assert.ok(
    functionsNamespace!.tools.some(
      (t) => t.name === "exec" && t.type === "custom",
    ),
    "exec must be declared type:custom inside the functions namespace in the real capture",
  );
  assert.equal(
    collaborationNamespace!.tools.some((t) => t.name === "exec"),
    false,
    "exec must not also (or instead) appear in the collaboration namespace",
  );

  const claudeRequest = assertOkTranslate(capture.body);
  const execTool = claudeRequest.tools?.find((t) => t.name === "exec");
  assert.ok(execTool, "exec must still be translated into a Claude tool");
  assert.deepEqual(
    execTool!.input_schema,
    {
      type: "object",
      properties: {
        input: {
          type: "string",
          description:
            "Raw command text, constrained by the grammar in this tool's description.",
        },
      },
      required: ["input"],
    },
    "exec must use the single-input custom-tool fallback schema, exactly as the mapCodexCustomToolToClaude sign-off (ruling 7) settled",
  );
  // Every other real tool in the capture (function-kind, both namespaces)
  // must also survive translation, proving the namespace flattening holds
  // for the full real shape, not just the one custom tool.
  const allDeclaredNames = [
    ...functionsNamespace!.tools.map((t) => t.name as string),
    ...collaborationNamespace!.tools.map((t) => t.name as string),
  ];
  const translatedNames = new Set(
    (claudeRequest.tools ?? []).map((t) => t.name),
  );
  for (const name of allDeclaredNames) {
    assert.ok(
      translatedNames.has(name),
      `${name} declared in the real capture must survive translation`,
    );
  }
});

// Fix pass 2 item 5: the live-capture fixture above claims to be redacted,
// but nothing before this test automated that check — a human re-scan is not
// a CI gate. This scans the fixture's raw bytes (never the real
// ~/.neurolink/reference/codex-cli-wire-sample.json capture, which this file
// must never read or copy) for the leak shapes a redaction script could miss:
// email addresses, bearer tokens, sk- keys, JWTs, AWS access-key ids,
// /Users/ or /home/ paths, and any UUID other than the all-zero placeholder
// `00000000-0000-0000-0000-000000000000` this fixture uses throughout.
const LEAK_PATTERNS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  {
    label: "email address",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  { label: "bearer token", pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi },
  { label: "sk- key", pattern: /\bsk-[A-Za-z0-9_-]{12,}\b/g },
  {
    label: "JWT",
    pattern:
      /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  { label: "AWS access key id", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { label: "/Users/ or /home/ path", pattern: /\/(?:Users|home)\/[^\s"'\\]+/g },
];

const ALL_ZERO_UUID = "00000000-0000-0000-0000-000000000000";
const UUID_PATTERN =
  /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g;

/** Scan raw fixture text for the leak shapes above. Returns one description
 *  per match found, empty when the text is clean. Exported at module scope
 *  (not just inline) so the self-check below and the real-fixture check both
 *  exercise the identical function. */
function scanForLeaks(text: string): string[] {
  const findings: string[] = [];
  for (const { label, pattern } of LEAK_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      findings.push(label);
    }
  }
  UUID_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = UUID_PATTERN.exec(text)) !== null) {
    if (match[0] !== ALL_ZERO_UUID) {
      findings.push("non-placeholder UUID");
    }
  }
  return findings;
}

test("leak scanner: self-check catches one planted value of every shape, and flags nothing on a clean control", () => {
  // Synthetic, obviously-fake values constructed here — never read from any
  // real capture or credential file — purely to prove the scanner's own
  // regexes fire. This is the "prove it fails on a planted value" check for
  // a scanner that has no source-code fix to revert; the fixture-scan test
  // right below is what stays CI-gated against the real asset.
  const planted = [
    "contact: test.user+leak@example-corp.test",
    "Authorization: Bearer sk_live_fake_planted_bearer_token_1234567890",
    "sk-FAKE00000000000000000000PLANTED",
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dGhpc2lzbm90YXJlYWxzaWc",
    "AKIAFAKEPLANTED12345",
    "/Users/plantedvictim/secret-notes.txt",
    "session 11111111-2222-3333-4444-555555555555 started",
  ].join("\n");
  const found = scanForLeaks(planted);
  for (const { label } of LEAK_PATTERNS) {
    assert.ok(
      found.includes(label),
      `planted ${label} must be caught by the scanner`,
    );
  }
  assert.ok(
    found.some((f) => f.startsWith("non-placeholder UUID")),
    "planted non-placeholder UUID must be caught by the scanner",
  );

  const clean = `every id here is the placeholder ${ALL_ZERO_UUID}, no secrets, no paths`;
  assert.deepEqual(
    scanForLeaks(clean),
    [],
    "a clean control string with only the placeholder UUID must report no findings",
  );
});

test("live-capture fixture (redacted) has no leaked secrets, tokens, real paths or non-placeholder UUIDs", () => {
  const raw = readFileSync(
    path.join(FIXTURES_DIR, "codex-cli-wire-sample-redacted.json"),
    "utf8",
  );
  const findings = scanForLeaks(raw);
  assert.deepEqual(
    findings,
    [],
    // No payload content in this message (only category labels, never the
    // matched substrings) per this repo's "keep payloads out of assertion
    // messages" rule.
    `redacted fixture failed the automated leak scan (${findings.length} categories matched)`,
  );
});

test("an image URL is untranslatable for Vertex and kept for Anthropic", () => {
  const request = minimalRequest({
    input: [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_image", image_url: "https://example.com/x.png" },
        ],
      },
    ],
  });
  const vertex = translateCodexRequestToClaude(request, {
    provider: "vertex",
    model: "claude-opus-4-6",
  });
  assert.equal(vertex.ok, false);
  if (!vertex.ok) {
    assert.equal(vertex.error.code, "UNTRANSLATABLE_REQUEST");
  }
  assert.equal(translateCodexRequestToClaude(request, TARGET).ok, true);
});

console.log(`Passed: ${passed}; Failed: 0; RESULT: PASS`);
