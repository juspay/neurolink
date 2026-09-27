#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — retired/stale model runtime defaults
 *
 * Several silent runtime defaults (RAGAS/guardrails judge models, the
 * LiteLLM and OpenAI provider defaults, health-check "try this instead"
 * recommendations, and static model-suggestion/fallback lists) pointed at
 * models that are either hard-retired (Google's gemini-1.5-pro/flash:
 * "SHUT DOWN. Returns 404." per `src/lib/constants/enums.ts`, and
 * Anthropic's claude-3-haiku, retired from the Anthropic API) or stale
 * (OpenAI's gpt-4o / gpt-4o-mini, superseded per the model-currency map).
 * A caller who never sets the relevant env var, or who hits a "model not
 * found" error and follows the SDK's own suggestion, would be handed a
 * model that 404s or is materially out of date.
 *
 * This is a static source-text guard rather than a live-call test: every
 * fix here is a string-literal default, the fix is "use a different
 * literal," and asserting on the literal in situ is exact, offline, and
 * immune to provider flakiness/API-key availability. It intentionally does
 * NOT touch `constants/tokens.ts`, `constants/contextWindows.ts`,
 * `utils/pricing.ts` (capability/limit/pricing tables keyed by model id,
 * not defaults) or `adapters/providerImageAdapter.ts` (vision-capability
 * allowlist) — those legitimately still list retired ids as table keys.
 *
 * Source: src/lib/evaluation/EvaluatorFactory.ts,
 *         src/lib/evaluation/ragasEvaluator.ts,
 *         src/lib/evaluation/EvaluatorRegistry.ts,
 *         src/lib/middleware/utils/guardrailsUtils.ts,
 *         src/lib/workflow/workflows/multiJudgeWorkflow.ts,
 *         src/lib/providers/litellm/client.ts,
 *         src/lib/providers/openAI/client.ts,
 *         src/lib/providers/openRouter/client.ts,
 *         src/lib/providers/googleVertex/client.ts,
 *         src/lib/utils/modelChoices.ts,
 *         src/lib/utils/providerHealth.ts (recommendation lists AND the
 *         standalone getConfiguredLiteLLMModel() availability-probe guess)
 *
 * Run: npx tsx test/continuous-test-suite-retired-model-defaults.ts
 *      pnpm run test:retired-model-defaults
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineSuite, assert } from "./helpers/harness.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC = path.join(__dirname, "..", "src", "lib");

const { test, runSuite } = defineSuite("Retired Model Defaults Regression", {
  offline: true,
});

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), "utf8");
}

await test("RAGAS evaluator presets no longer default to retired gemini-1.5-flash", async () => {
  const content = read("evaluation/EvaluatorFactory.ts");
  assert(
    !content.includes("gemini-1.5-flash"),
    "EvaluatorFactory.ts must not reference retired gemini-1.5-flash (SHUT DOWN, returns 404) in any preset",
  );
  const currentCount = (content.match(/gemini-2\.5-flash/g) ?? []).length;
  assert(
    currentCount >= 3,
    `expected the default/lenient/fast presets to all default to gemini-2.5-flash, found ${currentCount} occurrences`,
  );
});

await test("RAGASEvaluator class constructor default is not retired gemini-1.5-flash", async () => {
  const content = read("evaluation/ragasEvaluator.ts");
  assert(
    !content.includes("gemini-1.5-flash"),
    "ragasEvaluator.ts must not default evaluationModel to retired gemini-1.5-flash",
  );
  assert(
    content.includes('"gemini-2.5-flash"'),
    "ragasEvaluator.ts must default evaluationModel to current gemini-2.5-flash",
  );
});

await test("EvaluatorRegistry RAGAS metadata default is not retired gemini-1.5-flash", async () => {
  const content = read("evaluation/EvaluatorRegistry.ts");
  assert(
    !content.includes("gemini-1.5-flash"),
    "EvaluatorRegistry.ts must not advertise retired gemini-1.5-flash as the RAGAS evaluator's defaultModel",
  );
  assert(
    content.includes('defaultModel: "gemini-2.5-flash"'),
    "EvaluatorRegistry.ts must advertise gemini-2.5-flash as the RAGAS evaluator's defaultModel",
  );
});

await test("Guardrails precall evaluation default is not retired gemini-1.5-flash", async () => {
  const content = read("middleware/utils/guardrailsUtils.ts");
  assert(
    !content.includes("gemini-1.5-flash"),
    "guardrailsUtils.ts must not default performPrecallEvaluation's model to retired gemini-1.5-flash",
  );
  assert(
    content.includes('config.evaluationModel || "gemini-2.5-flash"'),
    "guardrailsUtils.ts must default performPrecallEvaluation's model to gemini-2.5-flash",
  );
});

await test("Multi-judge workflow ensemble no longer includes retired gemini-1.5-flash", async () => {
  const content = read("workflow/workflows/multiJudgeWorkflow.ts");
  assert(
    !content.includes("gemini-1.5-flash"),
    "multiJudgeWorkflow.ts must not add retired gemini-1.5-flash as an ensemble judge/model",
  );
  assert(
    content.includes('model: "gemini-2.5-flash"'),
    "multiJudgeWorkflow.ts must use gemini-2.5-flash for the model it previously pinned to gemini-1.5-flash",
  );
});

await test("LiteLLM provider default and fallback list are current, not stale/retired", async () => {
  const content = read("providers/litellm/client.ts");
  assert(
    /const FALLBACK_LITELLM_MODEL = "openai\/gpt-5\.4-mini";/.test(content),
    "litellm/client.ts FALLBACK_LITELLM_MODEL must be openai/gpt-5.4-mini (was stale openai/gpt-4o-mini)",
  );
  assert(
    !content.includes('"openai/gpt-4o-mini"'),
    "litellm/client.ts must not contain the stale openai/gpt-4o-mini literal anywhere",
  );
  assert(
    !content.includes('"anthropic/claude-3-haiku"'),
    "litellm/client.ts getFallbackModels() must not offer retired anthropic/claude-3-haiku",
  );
  assert(
    content.includes('"anthropic/claude-haiku-4-5-20251001"'),
    "litellm/client.ts getFallbackModels() must offer current anthropic/claude-haiku-4-5-20251001",
  );
});

await test("OpenAI provider default is not stale gpt-4o", async () => {
  const content = read("providers/openAI/client.ts");
  assert(
    /getProviderModel\("OPENAI_MODEL", "gpt-5\.4"\)/.test(content),
    'openAI/client.ts getOpenAIModel() must default to "gpt-5.4" (was stale "gpt-4o")',
  );
});

await test("OpenRouter fallback model list no longer offers retired google/gemini-1.5-pro", async () => {
  const content = read("providers/openRouter/client.ts");
  assert(
    !content.includes('"google/gemini-1.5-pro"'),
    "openRouter/client.ts hardcoded fallback list must not offer retired google/gemini-1.5-pro",
  );
  assert(
    content.includes('"google/gemini-2.5-pro"'),
    "openRouter/client.ts hardcoded fallback list must offer current google/gemini-2.5-pro",
  );
});

await test("Vertex 'model not available' suggestions drop retired gemini-1.5 ids", async () => {
  const content = read("providers/googleVertex/client.ts");
  assert(
    !content.includes("gemini-1.5-pro") &&
      !content.includes("gemini-1.5-flash"),
    "googleVertex/client.ts getModelSuggestions() must not suggest retired gemini-1.5-pro/flash to a caller recovering from a model-not-found error",
  );
});

await test("CLI model choice lists drop retired gemini-1.5 entries", async () => {
  const content = read("utils/modelChoices.ts");
  assert(
    !content.includes("GoogleAIModels.GEMINI_1_5_PRO") &&
      !content.includes("GoogleAIModels.GEMINI_1_5_FLASH"),
    "modelChoices.ts GOOGLE_AI TOP_MODELS_CONFIG must not list retired GEMINI_1_5_PRO/GEMINI_1_5_FLASH",
  );
  assert(
    !content.includes("VertexModels.GEMINI_1_5_PRO"),
    "modelChoices.ts VERTEX TOP_MODELS_CONFIG must not list retired GEMINI_1_5_PRO",
  );
});

await test("Provider health checks recommend current models, not retired gemini-1.5 ids", async () => {
  const content = read("utils/providerHealth.ts");
  assert(
    !content.includes("GEMINI_1_5_PRO") &&
      !content.includes("GEMINI_1_5_FLASH"),
    "providerHealth.ts getCommonModelsForProvider() must not recommend retired GEMINI_1_5_PRO/GEMINI_1_5_FLASH for GOOGLE_AI or VERTEX",
  );
  assert(
    !content.includes("gemini-1.5-pro") &&
      !content.includes("gemini-1.5-flash"),
    "providerHealth.ts VERTEX dual-architecture health text must not list retired gemini-1.5-pro/gemini-1.5-flash",
  );
});

await test("Provider health LiteLLM recommendations are current, not stale/retired", async () => {
  const content = read("utils/providerHealth.ts");
  assert(
    !content.includes('"openai/gpt-4o-mini"'),
    "providerHealth.ts LITELLM case must not recommend stale openai/gpt-4o-mini",
  );
  assert(
    !content.includes('"anthropic/claude-3-haiku"'),
    "providerHealth.ts LITELLM case must not recommend retired anthropic/claude-3-haiku",
  );
  assert(
    content.includes('"openai/gpt-5.4-mini"') &&
      content.includes('"anthropic/claude-haiku-4-5-20251001"'),
    "providerHealth.ts LITELLM case must recommend openai/gpt-5.4-mini and anthropic/claude-haiku-4-5-20251001",
  );
});

await test("Provider health LiteLLM availability probe default is not stale gpt-4o-mini", async () => {
  const content = read("utils/providerHealth.ts");
  assert(
    /getConfiguredLiteLLMModel\(\): string \{\s*return process\.env\.LITELLM_MODEL \|\| "openai\/gpt-5\.4-mini";/.test(
      content,
    ),
    "providerHealth.ts getConfiguredLiteLLMModel() must guess openai/gpt-5.4-mini, not stale openai/gpt-4o-mini, when LITELLM_MODEL is unset",
  );
});

await runSuite();
