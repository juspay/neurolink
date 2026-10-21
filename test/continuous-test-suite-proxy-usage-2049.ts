#!/usr/bin/env tsx
/**
 * Determinism exception (Rule 15): the ledger consumes local request-log rows,
 * and the translators serialize provided usage. Fixed fixtures check both
 * boundaries without requiring provider credentials or network access.
 */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readAccountUsage,
  resetAccountLedgerCache,
} from "../src/lib/proxy/accountLedger.js";
import { extractUsageFromStreamResult } from "../src/lib/proxy/proxyTranslationEngine.js";
import {
  OpenAIStreamSerializer,
  serializeOpenAIResponse,
} from "../src/lib/proxy/openaiFormat.js";
import {
  buildGeminiResponse,
  GeminiStreamSerializer,
} from "../src/lib/proxy/geminiFormat.js";
import { calculateCost } from "../src/lib/utils/pricing.js";

const date = "2026-01-15";
const testHome = mkdtempSync(join(tmpdir(), "neurolink-proxy-usage-"));
const oldHome = process.env.HOME;
const oldUserProfile = process.env.USERPROFILE;
try {
  const logs = join(testHome, ".neurolink", "logs");
  mkdirSync(logs, { recursive: true });
  const row = {
    accountType: "codex-oauth",
    provider: "openai",
    model: "gpt-5.5",
    outputTokens: 0,
    cacheCreationTokens: 0,
    inputTokens: 100_000,
    cacheReadTokens: 80_000,
  };
  writeFileSync(
    join(logs, `proxy-${date}.jsonl`),
    [
      {
        ...row,
        requestId: "codex-request",
        account: "codex@example.com",
        inputIncludesCachedTokens: true,
      },
      // A later empty re-log must retain the original row's input semantics.
      {
        requestId: "codex-request",
        account: "codex@example.com",
        accountType: "codex-oauth",
        model: "gpt-5.5",
      },
      {
        ...row,
        requestId: "legacy-request",
        account: "legacy@example.com",
      },
      {
        ...row,
        requestId: "disjoint-request",
        account: "disjoint@example.com",
        inputTokens: 20_000,
        inputIncludesCachedTokens: false,
      },
      {
        requestId: "disjoint-request",
        account: "disjoint@example.com",
        accountType: "codex-oauth",
        model: "gpt-5.5",
        inputIncludesCachedTokens: true,
      },
      {
        requestId: "anthropic-request",
        account: "one-hour@fixture",
        accountType: "oauth",
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        inputTokens: 1_000,
        outputTokens: 100,
        cacheReadTokens: 0,
        cacheCreationTokens: 300_000,
        cacheCreation1hTokens: 100_000,
        inputIncludesCachedTokens: false,
      },
    ]
      .map((entry) => JSON.stringify(entry))
      .join("\n") + "\n",
  );
  process.env.HOME = testHome;
  process.env.USERPROFILE = testHome;
  resetAccountLedgerCache();
  const totals = await readAccountUsage(date);
  const codex = totals.get("codex:codex@example.com");
  assert.ok(codex);
  assert.equal(codex.requests, 1);
  assert.equal(codex.inputTokens, 100_000);
  assert.equal(codex.cacheReadTokens, 80_000);
  assert.equal(codex.costUsd, 0.14);
  assert.equal(totals.get("codex:legacy@example.com")?.costUsd, 0.54);
  assert.equal(totals.get("codex:disjoint@example.com")?.costUsd, 0.14);
  const oneHour = totals.get("anthropic:one-hour@fixture");
  assert.ok(oneHour);
  assert.equal(
    oneHour.costUsd,
    calculateCost("anthropic", "claude-sonnet-4-6", {
      input: 1_000,
      output: 100,
      total: 301_100,
      cacheReadTokens: 0,
      cacheCreationTokens: 300_000,
      cacheCreation1hTokens: 100_000,
    }),
  );

  const usage = extractUsageFromStreamResult({
    input: 20,
    output: 10,
    cacheReadTokens: 80,
    cacheCreationTokens: 5,
    reasoning: 3,
  });
  assert.deepEqual(usage, {
    input: 20,
    output: 10,
    total: 115,
    cacheReadTokens: 80,
    cacheCreationTokens: 5,
    reasoning: 3,
  });
  assert.deepEqual(
    extractUsageFromStreamResult({
      inputTokens: 100,
      outputTokens: 10,
      inputTokenDetails: { cacheReadTokens: 80, cacheWriteTokens: 5 },
      outputTokenDetails: { reasoningTokens: 3 },
    }),
    { ...usage, input: 15, total: 110 },
  );

  const openai = serializeOpenAIResponse({ content: "ok", usage }, "gpt-5.5");
  assert.deepEqual(openai.usage, {
    prompt_tokens: 105,
    completion_tokens: 10,
    total_tokens: 115,
    prompt_tokens_details: { cached_tokens: 80 },
    completion_tokens_details: { reasoning_tokens: 3 },
  });
  const openaiStream = new OpenAIStreamSerializer("gpt-5.5");
  const finalOpenAIFrame = [...openaiStream.finish("stop", usage)].at(-2);
  assert.ok(finalOpenAIFrame);
  assert.deepEqual(JSON.parse(finalOpenAIFrame.slice(6)).usage, openai.usage);
  assert.equal(
    serializeOpenAIResponse(
      { content: "ok", usage: { ...usage, total: 117 } },
      "gpt-5.5",
    ).usage.total_tokens,
    117,
  );

  const gemini = buildGeminiResponse("ok", "stop", usage, "gemini-test");
  const expectedGeminiUsage = {
    promptTokenCount: 105,
    candidatesTokenCount: 10,
    totalTokenCount: 115,
    cachedContentTokenCount: 80,
    thoughtsTokenCount: 3,
  };
  assert.deepEqual(gemini.usageMetadata, expectedGeminiUsage);
  assert.deepEqual(
    buildGeminiResponse("ok", "stop", { ...usage, total: 117 }, "gemini-test")
      .usageMetadata,
    { ...expectedGeminiUsage, totalTokenCount: 117 },
  );
  const geminiStream = new GeminiStreamSerializer("gemini-test");
  assert.deepEqual(
    JSON.parse(geminiStream.finish("stop", usage)[0].slice(6)).usageMetadata,
    expectedGeminiUsage,
  );

  const plain = extractUsageFromStreamResult({ input: 7, output: 2 });
  assert.deepEqual(plain, { input: 7, output: 2, total: 9 });
  assert.deepEqual(
    serializeOpenAIResponse({ content: "ok", usage: plain }, "test").usage,
    { prompt_tokens: 7, completion_tokens: 2, total_tokens: 9 },
  );
  console.log(
    "Proxy usage: ledger, JSON and streaming cache/reasoning counts passed",
  );
} finally {
  resetAccountLedgerCache();
  if (oldHome === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = oldHome;
  }
  if (oldUserProfile === undefined) {
    delete process.env.USERPROFILE;
  } else {
    process.env.USERPROFILE = oldUserProfile;
  }
  rmSync(testHome, { recursive: true, force: true });
}
