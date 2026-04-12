#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Production Bugfix Verification
 *
 * Tests for fixes from NEUROLINK_FIX_PROMPT_2026-04-11:
 * 1. Vertex location routing: gemini-* forced to global, default global, env override
 * 2. Proxy routing: no classification, no contract gating, simple per-account cooldown
 * 3. Message builder sanitizes tool_use/tool_result from conversation history (Bug 2)
 *
 * Run with: npx tsx test/continuous-test-suite-bugfixes.ts
 */

import {
  applyRateLimitCooldown,
  buildProxyTranslationPlan,
  clearAccountCooldown,
  getAccountCooldownUntil,
  partitionAccountsByCooldown,
} from "../src/lib/proxy/routingPolicy.js";

import { convertToModelMessages } from "../src/lib/utils/messageBuilder.js";

import { resolveVertexLocation } from "../src/lib/providers/googleVertex.js";

import type {
  ParsedClaudeRequest,
  RuntimeAccountState,
} from "../src/lib/types/index.js";

// ============================================================================
// Types
// ============================================================================

type TestFunction = {
  name: string;
  fn: () => Promise<boolean | null>;
  category?: string;
};

type TestResult = {
  name: string;
  result: boolean | null;
  error: string | null;
};

type ColorName = "reset" | "bright" | "red" | "green" | "yellow" | "cyan";

// ============================================================================
// Helpers
// ============================================================================

const colors: Record<ColorName, string> = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(title, "cyan");
  log("=".repeat(60), "cyan");
}

function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP",
  details = "",
): void {
  const color: ColorName =
    status === "PASS" ? "green" : status === "FAIL" ? "red" : "yellow";
  log(`[${status}] ${testName}`, color);
  if (details) {
    log(`   ${details}`, "reset");
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function makeParsedRequest(
  overrides: Partial<ParsedClaudeRequest> = {},
): ParsedClaudeRequest {
  return {
    model: "claude-sonnet-4-20250514",
    maxTokens: 4096,
    stream: true,
    prompt: "hello",
    conversationMessages: [],
    tools: {},
    images: [],
    thinkingConfig: undefined,
    toolChoice: undefined,
    toolChoiceName: undefined,
    systemPrompt: "",
    ...overrides,
  } as ParsedClaudeRequest;
}

function makeRuntimeState(
  overrides: Partial<RuntimeAccountState> = {},
): RuntimeAccountState {
  return {
    coolingUntil: undefined,
    backoffLevel: 0,
    consecutiveRefreshFailures: 0,
    permanentlyDisabled: false,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

const tests: TestFunction[] = [
  // ---------- Bug 1: Vertex location routing via resolveVertexLocation ----------
  {
    name: "resolveVertexLocation: gemini-* forced to global regardless of configured location",
    category: "vertex-location",
    fn: async () => {
      return (
        resolveVertexLocation("gemini-3.1-flash-lite-preview", "us-east5") ===
          "global" &&
        resolveVertexLocation("gemini-2.5-flash", "us-central1") === "global" &&
        resolveVertexLocation("gemini-3.1-pro", "europe-west4") === "global"
      );
    },
  },
  {
    name: "resolveVertexLocation: non-gemini models keep configured location",
    category: "vertex-location",
    fn: async () => {
      return (
        resolveVertexLocation("claude-sonnet-4-20250514", "us-east5") ===
          "us-east5" &&
        resolveVertexLocation("text-embedding-004", "us-central1") ===
          "us-central1" &&
        resolveVertexLocation("custom-model", "europe-west4") === "europe-west4"
      );
    },
  },
  {
    name: "resolveVertexLocation: undefined model keeps configured location",
    category: "vertex-location",
    fn: async () => {
      return resolveVertexLocation(undefined, "us-east5") === "us-east5";
    },
  },
  {
    name: "resolveVertexLocation: gemini forced to global even when configured is global",
    category: "vertex-location",
    fn: async () => {
      return resolveVertexLocation("gemini-2.5-flash", "global") === "global";
    },
  },

  // ---------- Proxy routing: simplified ----------
  {
    name: "buildProxyTranslationPlan: no classification, all fallbacks eligible",
    category: "routing-policy",
    fn: async () => {
      const tools: Record<string, unknown> = {};
      for (let i = 0; i < 30; i++) {
        tools[`tool_${i}`] = {};
      }
      const parsed = makeParsedRequest({ tools, stream: false });
      const plan = buildProxyTranslationPlan(
        { provider: "anthropic", model: "claude-opus-4-20250514" },
        [
          { provider: "openai", model: "gpt-4o" },
          { provider: "vertex", model: "gemini-2.5-flash" },
        ],
        "claude-opus-4-20250514",
        parsed,
      );

      return (
        plan.attempts.length === 3 &&
        plan.skipped.length === 0 &&
        plan.attempts[1].provider === "openai" &&
        plan.attempts[2].provider === "vertex"
      );
    },
  },
  {
    name: "buildProxyTranslationPlan: auto-provider added when no fallback chain",
    category: "routing-policy",
    fn: async () => {
      const parsed = makeParsedRequest();
      const plan = buildProxyTranslationPlan(
        { provider: "anthropic", model: "claude-sonnet-4-20250514" },
        [],
        "claude-sonnet-4-20250514",
        parsed,
      );

      return (
        plan.attempts.length === 2 && plan.attempts[1].label === "auto-provider"
      );
    },
  },
  {
    name: "buildProxyTranslationPlan: no profile or classification fields",
    category: "routing-policy",
    fn: async () => {
      const parsed = makeParsedRequest();
      const plan = buildProxyTranslationPlan(
        { provider: "anthropic", model: "claude-sonnet-4-20250514" },
        [],
        "claude-sonnet-4-20250514",
        parsed,
      );

      const hasProfile = "profile" in plan;
      return !hasProfile && !!plan.requestedModel && !!plan.modelTier;
    },
  },
  {
    name: "getAccountCooldownUntil: returns null when not cooling",
    category: "routing-policy",
    fn: async () => {
      const state = makeRuntimeState();
      return getAccountCooldownUntil(state) === null;
    },
  },
  {
    name: "getAccountCooldownUntil: returns timestamp when cooling",
    category: "routing-policy",
    fn: async () => {
      const until = Date.now() + 5000;
      const state = makeRuntimeState({ coolingUntil: until });
      return getAccountCooldownUntil(state) === until;
    },
  },
  {
    name: "getAccountCooldownUntil: returns null for expired cooldown",
    category: "routing-policy",
    fn: async () => {
      const state = makeRuntimeState({ coolingUntil: Date.now() - 1000 });
      return getAccountCooldownUntil(state) === null;
    },
  },
  {
    name: "applyRateLimitCooldown: sets coolingUntil and increments backoff",
    category: "routing-policy",
    fn: async () => {
      const state = makeRuntimeState();
      const now = 1000000;
      const result = applyRateLimitCooldown({
        state,
        now,
        capMs: 600_000,
      });

      return (
        result.backoffMs === 1000 &&
        state.coolingUntil === now + 1000 &&
        state.backoffLevel === 1
      );
    },
  },
  {
    name: "applyRateLimitCooldown: exponential backoff doubles each time",
    category: "routing-policy",
    fn: async () => {
      const state = makeRuntimeState();
      const now = 1000000;

      const r1 = applyRateLimitCooldown({ state, now, capMs: 600_000 });
      const r2 = applyRateLimitCooldown({ state, now, capMs: 600_000 });
      const r3 = applyRateLimitCooldown({ state, now, capMs: 600_000 });

      return (
        r1.backoffMs === 1000 &&
        r2.backoffMs === 2000 &&
        r3.backoffMs === 4000 &&
        state.backoffLevel === 3
      );
    },
  },
  {
    name: "applyRateLimitCooldown: respects cap",
    category: "routing-policy",
    fn: async () => {
      const state = makeRuntimeState({ backoffLevel: 20 });
      const result = applyRateLimitCooldown({
        state,
        capMs: 5000,
      });
      return result.backoffMs === 5000;
    },
  },
  {
    name: "applyRateLimitCooldown: uses retryAfterMs when larger than floor",
    category: "routing-policy",
    fn: async () => {
      const state = makeRuntimeState();
      const result = applyRateLimitCooldown({
        state,
        retryAfterMs: 5000,
        capMs: 600_000,
      });
      return result.backoffMs === 5000;
    },
  },
  {
    name: "clearAccountCooldown: resets state",
    category: "routing-policy",
    fn: async () => {
      const state = makeRuntimeState({
        coolingUntil: Date.now() + 5000,
        backoffLevel: 3,
      });
      clearAccountCooldown(state);
      return state.coolingUntil === undefined && state.backoffLevel === 0;
    },
  },
  {
    name: "partitionAccountsByCooldown: separates eligible and skipped",
    category: "routing-policy",
    fn: async () => {
      const now = Date.now();
      const accounts = [
        { key: "a1", state: makeRuntimeState() },
        {
          key: "a2",
          state: makeRuntimeState({
            coolingUntil: now + 5000,
            backoffLevel: 1,
          }),
        },
        { key: "a3", state: makeRuntimeState() },
      ];

      const result = partitionAccountsByCooldown(accounts, (a) => a.state, now);

      return (
        result.eligible.length === 2 &&
        result.skipped.length === 1 &&
        result.skipped[0].account.key === "a2" &&
        result.eligible[0].key === "a1" &&
        result.eligible[1].key === "a3"
      );
    },
  },
  {
    name: "RuntimeAccountState: no scoped cooldown fields exist",
    category: "routing-policy",
    fn: async () => {
      const state = makeRuntimeState();
      return (
        !("requestClassCooldowns" in state) &&
        !("modelTierCooldowns" in state) &&
        !("requestClassBackoffLevels" in state) &&
        !("modelTierBackoffLevels" in state)
      );
    },
  },

  // ---------- Bug 2: Message builder sanitization ----------
  {
    name: "convertToModelMessages: skips assistant messages with only tool_use content",
    category: "message-builder",
    fn: async () => {
      const messages = [
        { role: "user", content: "Search for files" },
        {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_123",
              name: "search",
              input: { query: "test" },
            },
          ],
        },
        { role: "user", content: "Thanks" },
      ];

      const result = convertToModelMessages(messages as never);
      const hasEmptyAssistant = result.some(
        (m: { role: string; content: unknown }) =>
          m.role === "assistant" && m.content === "",
      );
      return !hasEmptyAssistant && result.length === 2;
    },
  },
  {
    name: "convertToModelMessages: keeps assistant messages with text content",
    category: "message-builder",
    fn: async () => {
      const messages = [
        { role: "user", content: "Hello" },
        {
          role: "assistant",
          content: [
            { type: "text", text: "Here are the results:" },
            {
              type: "tool_use",
              id: "toolu_123",
              name: "search",
              input: { query: "test" },
            },
          ],
        },
      ];

      const result = convertToModelMessages(messages as never);
      const assistantMsg = result.find(
        (m: { role: string }) => m.role === "assistant",
      );
      return (
        assistantMsg !== undefined &&
        assistantMsg.content === "Here are the results:"
      );
    },
  },
  {
    name: "convertToModelMessages: handles string content normally",
    category: "message-builder",
    fn: async () => {
      const messages = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ];

      const result = convertToModelMessages(messages as never);
      return (
        result.length === 2 &&
        result[1].role === "assistant" &&
        result[1].content === "Hi there!"
      );
    },
  },
  {
    name: "convertToModelMessages: preserves user messages with image-only content",
    category: "message-builder",
    fn: async () => {
      const messages = [
        {
          role: "user",
          content: [{ type: "image", image: "data:image/png;base64,abc123" }],
        },
        { role: "assistant", content: "I can see the image." },
      ];

      const result = convertToModelMessages(messages as never);
      const userMsgs = result.filter(
        (m: { role: string }) => m.role === "user",
      );
      return userMsgs.length === 1;
    },
  },
  {
    name: "convertToModelMessages: drops assistant tool_use but keeps user images",
    category: "message-builder",
    fn: async () => {
      const messages = [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this image" },
            { type: "image", image: "data:image/png;base64,abc123" },
          ],
        },
        {
          role: "assistant",
          content: [{ type: "tool_use", id: "t1", name: "analyze", input: {} }],
        },
        { role: "user", content: "What did you find?" },
      ];

      const result = convertToModelMessages(messages as never);
      const assistantMsgs = result.filter(
        (m: { role: string }) => m.role === "assistant",
      );
      const userMsgs = result.filter(
        (m: { role: string }) => m.role === "user",
      );
      return assistantMsgs.length === 0 && userMsgs.length === 2;
    },
  },
  {
    name: "convertToModelMessages: filters out tool_call and tool_result roles",
    category: "message-builder",
    fn: async () => {
      const messages = [
        { role: "user", content: "Search" },
        { role: "assistant", content: "Searching..." },
        { role: "tool_call", content: '{"name":"search"}' },
        { role: "tool_result", content: '{"results":[]}' },
        { role: "user", content: "Thanks" },
      ];

      const result = convertToModelMessages(messages as never);
      return (
        result.length === 3 &&
        result.every(
          (m: { role: string }) => m.role === "user" || m.role === "assistant",
        )
      );
    },
  },
];

// ============================================================================
// Runner
// ============================================================================

async function runTests(): Promise<void> {
  logSection("Production Bugfix Verification Tests");
  log(`Running ${tests.length} tests...\n`);

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result === null) {
        logTest(test.name, "SKIP");
        results.push({ name: test.name, result: null, error: null });
        skipped++;
      } else if (result) {
        logTest(test.name, "PASS");
        results.push({ name: test.name, result: true, error: null });
        passed++;
      } else {
        logTest(test.name, "FAIL");
        results.push({
          name: test.name,
          result: false,
          error: "assertion failed",
        });
        failed++;
      }
    } catch (error) {
      const msg = getErrorMessage(error);
      logTest(test.name, "FAIL", msg);
      results.push({ name: test.name, result: false, error: msg });
      failed++;
    }
  }

  logSection("Results");
  log(
    `Total: ${tests.length}  Passed: ${passed}  Failed: ${failed}  Skipped: ${skipped}`,
  );

  if (failed > 0) {
    log("\nFailed tests:", "red");
    for (const r of results) {
      if (r.result === false) {
        log(`  - ${r.name}: ${r.error}`, "red");
      }
    }
    process.exit(1);
  } else {
    log("\nAll tests passed!", "green");
    process.exit(0);
  }
}

runTests().catch((error) => {
  log(`\nFatal error: ${getErrorMessage(error)}`, "red");
  process.exit(1);
});
