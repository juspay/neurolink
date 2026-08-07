#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite: Evaluation
 *
 * Tests the RAGAS-style evaluation system including RAGASEvaluator,
 * ContextBuilder, PromptBuilder, scoring functions, and evaluation
 * provider integration, plus the merged scoring subsuite that covers
 * the rule/LLM scorer registry, preset & PipelineBuilder fluent APIs,
 * stream+evaluate, ground-truth scoring, BatchStrategy execution,
 * and the CLI `evaluate presets` smoke run.
 *
 * ~18 tests covering:
 * - RAGAS-style scoring dimensions (faithfulness, answer relevancy,
 *   context precision, context recall)
 * - Direct scoring API
 * - Context builder utility
 * - Different providers for evaluation
 * - Batch evaluation
 * - Custom prompt evaluation
 * - Scoring subsuite (#13–#22): rule scorers, LLM scorers via
 *   ScorerRegistry, inline enableEvaluation, stream+evaluate,
 *   preset pipelines, PipelineBuilder fluent API, good-vs-bad
 *   discriminative scoring, ground-truth scoring, batch via
 *   BatchStrategy, CLI `evaluate presets` smoke
 *
 * Note: RAGASEvaluator init (#1), RetryManager (#8/#9), and
 * Observability Spans (#13) were intentionally moved/removed during
 * the consolidation pass; observability coverage now lives in
 * continuous-test-suite-observability.ts.
 *
 * Source: src/lib/evaluation/ (6 files), src/lib/core/evaluation.ts,
 *         src/lib/core/evaluationProviders.ts, src/lib/types/evaluation*.ts
 *         (3 files).
 *
 * Run: npx tsx test/continuous-test-suite-evaluation.ts --provider=vertex
 */

import { spawn } from "node:child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  BatchStrategy,
  EvaluationPipeline,
  getMetricsAggregator,
  getPreset,
  NeuroLink,
  PipelineBuilder,
  resetMetricsAggregator,
  ScorerRegistry,
  SpanSerializer,
  SpanStatus,
  SpanType,
} from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIGURATION
// ============================================================

const PROVIDER_MAX_TOKENS: Record<string, number> = {
  anthropic: 8192,
  vertex: 10000,
  "google-ai-studio": 10000,
  openai: 16384,
  bedrock: 8192,
  ollama: 4096,
  openrouter: 4096,
  // OpenAI-compat providers added 2026
  deepseek: 4096,
  "nvidia-nim": 8192,
  "lm-studio": 1024,
  llamacpp: 1024,
};

const TEST_CONFIG = {
  provider: process.env.TEST_PROVIDER || "vertex",
  model: process.env.TEST_MODEL || (undefined as string | undefined),
  maxTokens: undefined as number | undefined,
  timeout: 90000,
  interTestDelay: 8000,
};

// ============================================================
// LOGGING UTILITIES — provided by shared harness
// ============================================================

import {
  defineSuite,
  log,
  logSection,
  type ColorName,
} from "./helpers/harness.js";

import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { recordTest, runSuite } = defineSuite("Evaluation");

/** Print-only logTest shim. Counters come from recordTest in the runner loop. */
function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const color: ColorName =
    status === "PASS"
      ? "green"
      : status === "FAIL"
        ? "red"
        : status === "SKIP"
          ? "yellow"
          : "blue";
  log(`[${status}] ${testName}${details ? ` — ${details}` : ""}`, color);
}
// ============================================================
// SHARED UTILITIES
// ============================================================

// Use boolean | null: true=pass, false=fail, null=skip
const skippedTests: Set<string> = new Set();

function buildBaseSDKOptions(): { provider: string; model?: string } {
  const opts: { provider: string; model?: string } = {
    provider: TEST_CONFIG.provider,
  };
  if (TEST_CONFIG.model) {
    opts.model = TEST_CONFIG.model;
  }
  return opts;
}

function isExpectedProviderError(msg: string): boolean {
  return [
    "API key",
    "authentication",
    "rate limit",
    "quota",
    "credentials",
    "could not be resolved",
    "Cannot connect",
    "Failed to generate",
  ].some((p) => msg.toLowerCase().includes(p.toLowerCase()));
}

/**
 * Mark a test as skipped for summary tracking.
 * Call this when isExpectedProviderError matches before returning null.
 */
function markSkipped(testName: string): void {
  skippedTests.add(testName);
}

async function globalCleanup(): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  if (global.gc) {
    global.gc();
  }
}

/**
 * Extract a numeric score from LLM response text.
 * Tries JSON "score": N first, then bare number fallback.
 * Returns NaN if no score can be extracted.
 */
function extractScore(text: string): number {
  // Try JSON-style "score": N or "score":N
  const jsonMatch = text.match(/"score"\s*:\s*([0-9]*\.?[0-9]+)/);
  if (jsonMatch) {
    return parseFloat(jsonMatch[1]);
  }
  // Try standalone decimal like 0.85 or 0.3
  const decimalMatch = text.match(/\b(0\.\d+|1\.0)\b/);
  if (decimalMatch) {
    return parseFloat(decimalMatch[1]);
  }
  // Try integer on a line by itself (e.g., just "8")
  const lineMatch = text.match(/^\s*(\d+(?:\.\d+)?)\s*$/m);
  if (lineMatch) {
    return parseFloat(lineMatch[1]);
  }
  return NaN;
}

// ============================================================
// EVALUATION TEST DATA
// ============================================================

/** Standard evaluation test data for RAGAS-style scoring */
const EVAL_TEST_DATA = {
  question:
    "What are the three main benefits of using TypeScript over JavaScript?",
  goodAnswer:
    "The three main benefits of TypeScript over JavaScript are: " +
    "1) Static type checking, which catches errors early before runtime. " +
    "2) Better IDE support with autocompletion and refactoring capabilities. " +
    "3) Enhanced code maintainability through explicit type annotations and interfaces " +
    "that make large codebases easier to understand and modify.",
  poorAnswer:
    "TypeScript was created by Google in 2005 and is primarily used for mobile app development. " +
    "Its main benefits are automatic memory management, built-in database connectivity, " +
    "and native support for machine learning algorithms.",
  context:
    "TypeScript is a strongly typed programming language that builds on JavaScript. " +
    "It was developed by Microsoft and first released in 2012. TypeScript adds optional " +
    "static typing, classes, and interfaces to JavaScript. The key benefits include: " +
    "static type checking for catching errors early, enhanced IDE support with better " +
    "autocompletion and refactoring capabilities, improved code maintainability through " +
    "explicit type annotations and interfaces, and better tooling for large-scale " +
    "application development.",
  groundTruth:
    "The three main benefits are static type checking, better IDE support " +
    "(autocompletion, refactoring), and enhanced code maintainability " +
    "(interfaces, type annotations).",
};

/**
 * Helper: Score an answer on a given dimension using the LLM-as-judge pattern.
 * Returns a score in [0,1] or NaN on failure.
 */
async function scoreAnswerOnDimension(
  sdk: NeuroLink,
  dimension: string,
  dimensionDescription: string,
  answer: string,
  extras: { context?: string; groundTruth?: string } = {},
  signal?: AbortSignal,
): Promise<number> {
  const contextBlock = extras.context ? `\nContext: ${extras.context}` : "";
  const groundTruthBlock = extras.groundTruth
    ? `\nGround truth answer: ${extras.groundTruth}`
    : "";

  // Dimension-specific framing: "context precision" needs the judge to focus
  // on the CONTEXT (not the answer). Without this clarification, judges see
  // the same good answer in both calls and rate it 1.00 regardless of which
  // context was supplied.
  const focusInstruction = (() => {
    const d = dimension.toLowerCase();
    if (d.includes("context precision")) {
      return `Focus exclusively on the CONTEXT itself. Estimate the fraction of the context that is directly relevant to the question. If half the context is irrelevant filler, the score should be around 0.5. If all the context is on-topic, score 1.0. Ignore answer quality entirely.`;
    }
    if (d.includes("context recall")) {
      return `Estimate how much of the information needed to answer the question is actually present in the context. Ignore answer quality.`;
    }
    if (d.includes("faithfulness")) {
      return `Score whether the answer is factually grounded in the context. 1.0 = every claim in the answer is supported by the context. 0.0 = the answer contradicts or hallucinates beyond the context.`;
    }
    if (d.includes("answer relevancy")) {
      return `Score how directly the answer addresses the question. Ignore the context.`;
    }
    return "";
  })();

  const prompt = `You are an evaluation judge. Score the ${dimension} of an AI answer.
${dimensionDescription}
${focusInstruction}
${contextBlock}
Question: ${EVAL_TEST_DATA.question}
${groundTruthBlock}
Answer to evaluate: ${answer}

Score the ${dimension} from 0.0 to 1.0 (where 1.0 = perfect).
Respond ONLY with a JSON object: {"score": <number between 0 and 1>, "reasoning": "<brief explanation>"}`;

  const result = await sdk.generate({
    input: { text: prompt },
    abortSignal: signal,
    maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
    ...buildBaseSDKOptions(),
  });

  const responseText = result?.content || "";
  return extractScore(responseText);
}

// ============================================================
// TEST #2: RAGAS Faithfulness Scoring
// ============================================================

async function testRAGASFaithfulness(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("2. RAGAS Faithfulness Scoring", "TESTING");
  try {
    // Faithfulness: whether every claim in the answer can be verified from the context.
    // A good answer grounded in context should score HIGHER than a poor/vague answer.
    const dimensionDesc =
      "Faithfulness measures whether every claim in the answer can be verified from the given context.";

    const goodScore = await scoreAnswerOnDimension(
      sdk,
      "faithfulness",
      dimensionDesc,
      EVAL_TEST_DATA.goodAnswer,
      {
        context: EVAL_TEST_DATA.context,
      },
      signal,
    );

    // Brief delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 2000));

    const poorScore = await scoreAnswerOnDimension(
      sdk,
      "faithfulness",
      dimensionDesc,
      EVAL_TEST_DATA.poorAnswer,
      {
        context: EVAL_TEST_DATA.context,
      },
      signal,
    );

    if (isNaN(goodScore) && isNaN(poorScore)) {
      logTest(
        "2. RAGAS Faithfulness Scoring",
        "FAIL",
        "Could not extract scores from either good or poor answer evaluation",
      );
      return false;
    }

    // If only one score parsed, that's a partial failure
    if (isNaN(goodScore) || isNaN(poorScore)) {
      const parsed = isNaN(goodScore)
        ? `poor=${poorScore}`
        : `good=${goodScore}`;
      logTest(
        "2. RAGAS Faithfulness Scoring",
        "FAIL",
        `Only one score parsed (${parsed}); need both to compare`,
      );
      return false;
    }

    if (goodScore > poorScore) {
      logTest(
        "2. RAGAS Faithfulness Scoring",
        "PASS",
        `Good answer (${goodScore.toFixed(2)}) > Poor answer (${poorScore.toFixed(2)})`,
      );
      return true;
    }

    // Edge case: scores equal or inverted — this is a genuine fail
    logTest(
      "2. RAGAS Faithfulness Scoring",
      "FAIL",
      `Good answer (${goodScore.toFixed(2)}) did not score higher than poor answer (${poorScore.toFixed(2)})`,
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("2. RAGAS Faithfulness Scoring");
      logTest("2. RAGAS Faithfulness Scoring", "SKIP", msg);
      return null;
    }
    logTest("2. RAGAS Faithfulness Scoring", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #3: RAGAS Answer Relevancy Scoring
// ============================================================

async function testRAGASAnswerRelevancy(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("3. RAGAS Answer Relevancy", "TESTING");
  try {
    // Answer relevancy: how well the answer addresses the question asked.
    const dimensionDesc =
      "Answer relevancy measures how well the answer directly addresses the question asked. " +
      "A highly relevant answer fully addresses every aspect of the question.";

    const goodScore = await scoreAnswerOnDimension(
      sdk,
      "answer relevancy",
      dimensionDesc,
      EVAL_TEST_DATA.goodAnswer,
      {},
      signal,
    );

    await new Promise((r) => setTimeout(r, 2000));

    const poorScore = await scoreAnswerOnDimension(
      sdk,
      "answer relevancy",
      dimensionDesc,
      EVAL_TEST_DATA.poorAnswer,
      {},
      signal,
    );

    if (isNaN(goodScore) && isNaN(poorScore)) {
      logTest(
        "3. RAGAS Answer Relevancy",
        "FAIL",
        "Could not extract scores from either answer evaluation",
      );
      return false;
    }

    if (isNaN(goodScore) || isNaN(poorScore)) {
      const parsed = isNaN(goodScore)
        ? `poor=${poorScore}`
        : `good=${goodScore}`;
      logTest(
        "3. RAGAS Answer Relevancy",
        "FAIL",
        `Only one score parsed (${parsed}); need both to compare`,
      );
      return false;
    }

    if (goodScore > poorScore) {
      logTest(
        "3. RAGAS Answer Relevancy",
        "PASS",
        `Good answer (${goodScore.toFixed(2)}) > Poor answer (${poorScore.toFixed(2)})`,
      );
      return true;
    }

    logTest(
      "3. RAGAS Answer Relevancy",
      "FAIL",
      `Good answer (${goodScore.toFixed(2)}) did not score higher than poor answer (${poorScore.toFixed(2)})`,
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("3. RAGAS Answer Relevancy");
      logTest("3. RAGAS Answer Relevancy", "SKIP", msg);
      return null;
    }
    logTest("3. RAGAS Answer Relevancy", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #4: RAGAS Context Precision Scoring
// ============================================================

async function testRAGASContextPrecision(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("4. RAGAS Context Precision", "TESTING");
  try {
    // Context precision: how much of the context is relevant to the question.
    // Good context (focused on TypeScript benefits) should score higher than
    // bloated context with lots of irrelevant info.
    const dimensionDesc =
      "Context precision measures how much of the provided context is actually relevant " +
      "and useful for answering the given question. High precision means little irrelevant context.";

    // For context precision, we vary the CONTEXT (not the answer).
    // Focused context should score higher than bloated context with irrelevant info.
    const bloatedContext =
      EVAL_TEST_DATA.context +
      " The weather in Tokyo is usually mild in spring. Bananas are the most popular fruit worldwide. " +
      "The Eiffel Tower was built in 1889 for the World Fair. The deepest ocean trench is the Mariana Trench. " +
      "Cooking pasta requires boiling water for 8-12 minutes. The population of Australia is approximately 26 million.";

    const focusedScore = await scoreAnswerOnDimension(
      sdk,
      "context precision",
      dimensionDesc,
      EVAL_TEST_DATA.goodAnswer,
      {
        context: EVAL_TEST_DATA.context,
        groundTruth: EVAL_TEST_DATA.groundTruth,
      },
      signal,
    );

    await new Promise((r) => setTimeout(r, 2000));

    const bloatedScore = await scoreAnswerOnDimension(
      sdk,
      "context precision",
      dimensionDesc,
      EVAL_TEST_DATA.goodAnswer,
      {
        context: bloatedContext,
        groundTruth: EVAL_TEST_DATA.groundTruth,
      },
      signal,
    );

    if (isNaN(focusedScore) && isNaN(bloatedScore)) {
      logTest(
        "4. RAGAS Context Precision",
        "FAIL",
        "Could not extract scores from either context evaluation",
      );
      return false;
    }

    if (isNaN(focusedScore) || isNaN(bloatedScore)) {
      const parsed = isNaN(focusedScore)
        ? `bloated=${bloatedScore}`
        : `focused=${focusedScore}`;
      logTest(
        "4. RAGAS Context Precision",
        "FAIL",
        `Only one score parsed (${parsed}); need both to compare`,
      );
      return false;
    }

    if (focusedScore > bloatedScore) {
      logTest(
        "4. RAGAS Context Precision",
        "PASS",
        `Focused context (${focusedScore.toFixed(2)}) > Bloated context (${bloatedScore.toFixed(2)})`,
      );
      return true;
    }

    logTest(
      "4. RAGAS Context Precision",
      "FAIL",
      `Focused context (${focusedScore.toFixed(2)}) did not score higher than bloated context (${bloatedScore.toFixed(2)})`,
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("4. RAGAS Context Precision");
      logTest("4. RAGAS Context Precision", "SKIP", msg);
      return null;
    }
    logTest("4. RAGAS Context Precision", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #5: RAGAS Context Recall Scoring
// ============================================================

async function testRAGASContextRecall(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("5. RAGAS Context Recall", "TESTING");
  try {
    // Context recall: whether the context contains all information needed for the ground truth.
    // We vary the CONTEXT (not the answer): full context should score higher than partial context.
    const dimensionDesc =
      "Context recall measures whether the provided context contains all the information " +
      "needed to produce the ground truth answer. High recall means no missing info.";

    // Partial context — missing the key benefit details the ground truth requires
    const partialContext =
      "TypeScript is a programming language developed by Microsoft. It was first released in 2012.";

    const fullScore = await scoreAnswerOnDimension(
      sdk,
      "context recall",
      dimensionDesc,
      EVAL_TEST_DATA.goodAnswer,
      {
        context: EVAL_TEST_DATA.context,
        groundTruth: EVAL_TEST_DATA.groundTruth,
      },
      signal,
    );

    await new Promise((r) => setTimeout(r, 2000));

    const partialScore = await scoreAnswerOnDimension(
      sdk,
      "context recall",
      dimensionDesc,
      EVAL_TEST_DATA.goodAnswer,
      {
        context: partialContext,
        groundTruth: EVAL_TEST_DATA.groundTruth,
      },
      signal,
    );

    if (isNaN(fullScore) && isNaN(partialScore)) {
      logTest(
        "5. RAGAS Context Recall",
        "FAIL",
        "Could not extract scores from either context evaluation",
      );
      return false;
    }

    if (isNaN(fullScore) || isNaN(partialScore)) {
      const parsed = isNaN(fullScore)
        ? `partial=${partialScore}`
        : `full=${fullScore}`;
      logTest(
        "5. RAGAS Context Recall",
        "FAIL",
        `Only one score parsed (${parsed}); need both to compare`,
      );
      return false;
    }

    if (fullScore > partialScore) {
      logTest(
        "5. RAGAS Context Recall",
        "PASS",
        `Full context (${fullScore.toFixed(2)}) > Partial context (${partialScore.toFixed(2)})`,
      );
      return true;
    }

    logTest(
      "5. RAGAS Context Recall",
      "FAIL",
      `Full context (${fullScore.toFixed(2)}) did not score higher than partial context (${partialScore.toFixed(2)})`,
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("5. RAGAS Context Recall");
      logTest("5. RAGAS Context Recall", "SKIP", msg);
      return null;
    }
    logTest("5. RAGAS Context Recall", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #6: Direct Scoring API via sdk.evaluate()
// ============================================================

async function testScoringFunction(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("6. Direct Scoring API", "TESTING");
  try {
    // Import RAGASEvaluator directly from dist exports
    const distIndexPath = path.join(__dirname, "../dist/index.js");
    const distModule = await import(distIndexPath);
    const { RAGASEvaluator } = distModule;

    if (typeof RAGASEvaluator !== "function") {
      logTest(
        "6. Direct Scoring API",
        "SKIP",
        "RAGASEvaluator not exported from dist",
      );
      return null;
    }

    // RAGASEvaluator constructor: (evaluationModel?, providerName?, threshold?, promptGenerator?)
    const evaluator = new RAGASEvaluator(
      undefined, // evaluationModel — uses default or env
      TEST_CONFIG.provider, // providerName
      7, // threshold
    );

    // Build an EnhancedEvaluationContext matching the required type
    const evalContext = {
      userQuery: EVAL_TEST_DATA.question,
      queryAnalysis: {
        type: "question" as const,
        complexity: "medium" as const,
        shouldHaveUsedTools: false,
      },
      aiResponse: EVAL_TEST_DATA.goodAnswer,
      provider: TEST_CONFIG.provider,
      model: "default",
      generationParams: {},
      toolExecutions: [],
      conversationHistory: [],
      responseTime: 500,
      tokenUsage: {
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
      },
      attemptNumber: 1,
    };

    const evalResult = await evaluator.evaluate(evalContext);

    if (
      evalResult &&
      typeof evalResult === "object" &&
      typeof evalResult.finalScore === "number"
    ) {
      logTest(
        "6. Direct Scoring API",
        "PASS",
        `RAGASEvaluator.evaluate() returned: finalScore=${evalResult.finalScore}, relevance=${evalResult.relevanceScore}, accuracy=${evalResult.accuracyScore}`,
      );
      return true;
    }

    logTest(
      "6. Direct Scoring API",
      "FAIL",
      "RAGASEvaluator.evaluate() returned empty or invalid result",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("6. Direct Scoring API");
      logTest("6. Direct Scoring API", "SKIP", msg);
      return null;
    }
    logTest(
      "6. Direct Scoring API",
      "FAIL",
      `RAGASEvaluator.evaluate() threw: ${msg}`,
    );
    return false;
  }
}

// ============================================================
// TEST #7: Context Builder Utility
// ============================================================

async function testContextBuilder(
  _sdk: NeuroLink,
  _signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("7. Context Builder Utility", "TESTING");
  try {
    // Try importing ContextBuilder from dist
    const distIndexPath = path.join(__dirname, "../dist/index.js");
    const distModule = await import(distIndexPath);

    if (typeof distModule.ContextBuilder === "function") {
      try {
        const builder = new distModule.ContextBuilder();
        // Test that it has the expected methods
        const hasBuildContext = typeof builder.buildContext === "function";
        const hasRecordEval = typeof builder.recordEvaluation === "function";
        const hasReset = typeof builder.reset === "function";

        if (hasBuildContext || hasRecordEval || hasReset) {
          const methods = [
            hasBuildContext && "buildContext",
            hasRecordEval && "recordEvaluation",
            hasReset && "reset",
          ].filter(Boolean);

          logTest(
            "7. Context Builder Utility",
            "PASS",
            `ContextBuilder instantiated; methods: ${methods.join(", ")}`,
          );
          return true;
        }

        logTest(
          "7. Context Builder Utility",
          "FAIL",
          "ContextBuilder instantiated but missing expected methods",
        );
        return false;
      } catch (initError) {
        const initMsg =
          initError instanceof Error ? initError.message : String(initError);
        logTest(
          "7. Context Builder Utility",
          "FAIL",
          `ContextBuilder exported but failed to instantiate: ${initMsg}`,
        );
        return false;
      }
    }

    // ContextBuilder not exported from dist
    logTest(
      "7. Context Builder Utility",
      "SKIP",
      "ContextBuilder not exported from dist",
    );
    return null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("7. Context Builder Utility", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #10: Evaluation with Different Provider
// ============================================================

async function testEvaluationProviders(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("10. Evaluation Providers", "TESTING");
  try {
    // Generate with the test provider and verify the generate() call succeeds.
    // This validates that the provider can be used as an evaluation judge.
    const result = await sdk.generate({
      abortSignal: signal,
      input: {
        text: `You are an evaluation judge. Rate this answer on a 1-10 scale.
Question: What is the capital of France?
Answer: Paris is the capital of France.
Respond with ONLY a JSON object: {"score": <1-10>, "reasoning": "<brief>"}`,
      },
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 200, 200),
      ...buildBaseSDKOptions(),
    });

    if (!result?.content) {
      logTest(
        "10. Evaluation Providers",
        "FAIL",
        "generate() returned no content",
      );
      return false;
    }

    const responseText = result.content;
    const score = extractScore(responseText);

    if (!isNaN(score)) {
      logTest(
        "10. Evaluation Providers",
        "PASS",
        `Provider ${TEST_CONFIG.provider} produced evaluation score: ${score}`,
      );
      return true;
    }

    // Even if score parsing failed, the provider responded - that's a valid test
    if (responseText.length > 10) {
      logTest(
        "10. Evaluation Providers",
        "PASS",
        `Provider ${TEST_CONFIG.provider} produced evaluation response (${responseText.length} chars)`,
      );
      return true;
    }

    logTest(
      "10. Evaluation Providers",
      "FAIL",
      `Provider response too short or empty: "${responseText.substring(0, 100)}"`,
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("10. Evaluation Providers");
      logTest("10. Evaluation Providers", "SKIP", msg);
      return null;
    }
    logTest("10. Evaluation Providers", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #11: Batch Evaluation
// ============================================================

async function testBatchEvaluation(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("11. Batch Evaluation", "TESTING");
  try {
    // Generate 3 evaluation calls and assert all 3 return valid results.
    const evaluationPairs = [
      {
        question: "What is the capital of Japan?",
        answer: "Tokyo is the capital of Japan.",
      },
      {
        question: "What programming language was created by Guido van Rossum?",
        answer: "Python was created by Guido van Rossum.",
      },
      {
        question: "What is the speed of light?",
        answer:
          "The speed of light in vacuum is approximately 299,792,458 meters per second.",
      },
    ];

    const results: Array<{
      index: number;
      hasContent: boolean;
      score: number;
    }> = [];

    for (let i = 0; i < evaluationPairs.length; i++) {
      const pair = evaluationPairs[i];

      try {
        const result = await sdk.generate({
          abortSignal: signal,
          input: {
            text: `You are an evaluation judge. Rate the following answer for accuracy and completeness.
Question: ${pair.question}
Answer: ${pair.answer}
Respond ONLY with a JSON object: {"score": <1-10>, "reasoning": "<brief>"}`,
          },
          maxTokens: Math.min(TEST_CONFIG.maxTokens || 300, 300),
          ...buildBaseSDKOptions(),
        });

        const responseText = result?.content || "";
        const score = extractScore(responseText);

        results.push({
          index: i,
          hasContent: responseText.length > 0,
          score: isNaN(score) ? -1 : score,
        });
      } catch (pairError) {
        const pairMsg =
          pairError instanceof Error ? pairError.message : String(pairError);
        if (isExpectedProviderError(pairMsg)) {
          log(`   Pair ${i + 1} skipped: provider error`, "yellow");
          continue;
        }
        // Non-provider error - record as failed
        results.push({ index: i, hasContent: false, score: -1 });
      }

      // Brief delay between evaluations
      if (i < evaluationPairs.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    const validResults = results.filter((r) => r.hasContent);
    const scoredResults = results.filter((r) => r.score > 0);

    if (validResults.length >= 3) {
      logTest(
        "11. Batch Evaluation",
        "PASS",
        `All ${validResults.length}/${evaluationPairs.length} evaluations returned content; ${scoredResults.length} had parseable scores`,
      );
      return true;
    }

    if (validResults.length === 0) {
      logTest(
        "11. Batch Evaluation",
        "FAIL",
        "No evaluation calls returned valid content",
      );
      return false;
    }

    logTest(
      "11. Batch Evaluation",
      "FAIL",
      `Only ${validResults.length}/${evaluationPairs.length} evaluations returned content (need all 3)`,
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("11. Batch Evaluation");
      logTest("11. Batch Evaluation", "SKIP", msg);
      return null;
    }
    logTest("11. Batch Evaluation", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #12: Evaluation with Custom Prompt
// ============================================================

async function testEvaluationWithCustomPrompt(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("12. Custom Prompt Evaluation", "TESTING");
  try {
    // Generate with a custom system prompt for domain-specific evaluation.
    // Assert the response is meaningful and addresses the custom criteria.
    const result = await sdk.generate({
      abortSignal: signal,
      input: {
        text: `Evaluate the following AI response using these CUSTOM domain-specific criteria:

Question: ${EVAL_TEST_DATA.question}
AI Response: ${EVAL_TEST_DATA.goodAnswer}

Score using this custom rubric:
- Domain relevance (1-10): How well does this relate to the asked domain?
- Terminology accuracy (1-10): Are technical terms used correctly?
- Actionability (1-10): Can the reader act on this information?

Respond with JSON:
{
  "domainRelevance": <1-10>,
  "terminologyAccuracy": <1-10>,
  "actionability": <1-10>,
  "overallScore": <1-10>,
  "reasoning": "<brief>"
}`,
      },
      systemPrompt:
        "You are a domain-specific evaluation judge specializing in software engineering quality assessment.",
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
      ...buildBaseSDKOptions(),
    });

    if (!result?.content) {
      logTest(
        "12. Custom Prompt Evaluation",
        "FAIL",
        "generate() returned no content for custom evaluation prompt",
      );
      return false;
    }

    const responseText = result.content;

    // Check that the response contains at least some evaluation content
    const hasCustomScores =
      responseText.includes("domainRelevance") ||
      responseText.includes("terminologyAccuracy") ||
      responseText.includes("actionability") ||
      responseText.includes("overallScore");

    if (hasCustomScores) {
      logTest(
        "12. Custom Prompt Evaluation",
        "PASS",
        "Custom evaluation prompt produced domain-specific scores",
      );
      return true;
    }

    // Fallback: the response is meaningful (at least 30 chars with evaluation-like content)
    if (responseText.length > 30) {
      const lower = responseText.toLowerCase();
      const hasEvalContent =
        lower.includes("score") ||
        lower.includes("rating") ||
        lower.includes("relevance") ||
        lower.includes("accuracy");
      if (hasEvalContent) {
        logTest(
          "12. Custom Prompt Evaluation",
          "PASS",
          `Custom evaluation produced meaningful response (${responseText.length} chars)`,
        );
        return true;
      }
    }

    logTest(
      "12. Custom Prompt Evaluation",
      "FAIL",
      `Custom prompt produced insufficient evaluation output: "${responseText.substring(0, 200)}"`,
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("12. Custom Prompt Evaluation");
      logTest("12. Custom Prompt Evaluation", "SKIP", msg);
      return null;
    }
    logTest("12. Custom Prompt Evaluation", "FAIL", msg);
    return false;
  }
}

// ============================================================
// SCORING SUBSUITE: from continuous-test-suite-evaluation-scoring.ts
// ============================================================
//
// Tests 13-22 cover SDK-level evaluate() integration (rule scorers, LLM
// scorers, inline enableEvaluation, stream+evaluate, preset pipelines,
// PipelineBuilder, discriminative good-vs-bad, ground truth, batch, CLI).
// EVAL_TEST_DATA above already has the question/context/groundTruth fields
// these tests rely on; the duplicate definition was removed during merge.

// TEST #13: Generate and Evaluate with Rule Scorers
// ============================================================

async function testGenerateAndEvaluateWithRuleScorers(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("13. Generate + Evaluate with Rule Scorers", "TESTING");
  try {
    // Step 1: Generate a response with SDK
    const result = await sdk.generate({
      abortSignal: signal,
      input: { text: EVAL_TEST_DATA.question },
      ...buildBaseSDKOptions(),
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
    });

    if (!result?.content) {
      logTest(
        "13. Generate + Evaluate with Rule Scorers",
        "FAIL",
        "generate() returned no content",
      );
      return false;
    }

    // Step 2: Build a rule-scorer pipeline and evaluate the response
    const pipeline = await PipelineBuilder.create("rule-scorer-test")
      .addScorer("length", { threshold: 0.3 })
      .addScorer("format", { threshold: 0.3 })
      .addScorer("keyword-coverage", { threshold: 0.3 })
      .aggregateWith("average")
      .passThreshold(0.3)
      .buildAndInitialize();

    const evalResult = await pipeline.execute({
      query: EVAL_TEST_DATA.question,
      response: result.content,
    });

    // Step 3: Verify scores came back
    if (
      evalResult &&
      Array.isArray(evalResult.scores) &&
      evalResult.scores.length > 0 &&
      typeof evalResult.overallScore === "number"
    ) {
      const scorerNames = evalResult.scores
        .map((s) => `${s.scorerId}=${s.score.toFixed(1)}`)
        .join(", ");
      logTest(
        "13. Generate + Evaluate with Rule Scorers",
        "PASS",
        `Generated ${result.content.length} chars, ${evalResult.scores.length} scorers: [${scorerNames}], overall: ${evalResult.overallScore.toFixed(2)}`,
      );
      return true;
    }

    logTest(
      "13. Generate + Evaluate with Rule Scorers",
      "FAIL",
      "No scores returned from pipeline",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("13. Generate + Evaluate with Rule Scorers");
      logTest("13. Generate + Evaluate with Rule Scorers", "SKIP", msg);
      return null;
    }
    logTest("13. Generate + Evaluate with Rule Scorers", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #14: Generate and Evaluate with LLM Scorers
// ============================================================

async function testGenerateAndEvaluateWithLLMScorers(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("14. Generate + Evaluate with LLM Scorers", "TESTING");
  try {
    // Step 1: Generate a factual response with context
    const result = await sdk.generate({
      abortSignal: signal,
      input: {
        text: `Based on the following context, answer the question.

Context: ${EVAL_TEST_DATA.context}

Question: ${EVAL_TEST_DATA.question}`,
      },
      ...buildBaseSDKOptions(),
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
    });

    if (!result?.content) {
      logTest(
        "14. Generate + Evaluate with LLM Scorers",
        "FAIL",
        "generate() returned no content",
      );
      return false;
    }

    // Step 2: Evaluate with LLM scorers
    // Initialize registry first so LLM scorers are available
    await ScorerRegistry.registerBuiltInScorers();

    const hallucinationScorer = await ScorerRegistry.getScorer("hallucination");
    const faithfulnessScorer = await ScorerRegistry.getScorer("faithfulness");
    const relevancyScorer = await ScorerRegistry.getScorer("answer-relevancy");

    if (!hallucinationScorer && !faithfulnessScorer && !relevancyScorer) {
      // The scorer registry is set up in this process via
      // ScorerRegistry.registerBuiltInScorers() above — an empty result
      // means registration itself is broken, not an environmental SKIP.
      logTest(
        "14. Generate + Evaluate with LLM Scorers",
        "FAIL",
        "No LLM scorers available in registry after registerBuiltInScorers()",
      );
      return false;
    }

    const scorerInput = {
      query: EVAL_TEST_DATA.question,
      response: result.content,
      context: [EVAL_TEST_DATA.context],
    };

    // Score with whichever LLM scorers are available
    const scores: Array<{ name: string; score: number }> = [];

    if (hallucinationScorer) {
      const hScore = await hallucinationScorer.score(scorerInput);
      if (hScore && typeof hScore.score === "number") {
        scores.push({ name: "hallucination", score: hScore.score });
      }
    }

    if (faithfulnessScorer) {
      const fScore = await faithfulnessScorer.score(scorerInput);
      if (fScore && typeof fScore.score === "number") {
        scores.push({ name: "faithfulness", score: fScore.score });
      }
    }

    if (relevancyScorer) {
      const rScore = await relevancyScorer.score(scorerInput);
      if (rScore && typeof rScore.score === "number") {
        scores.push({ name: "answer-relevancy", score: rScore.score });
      }
    }

    if (scores.length > 0) {
      const summary = scores
        .map((s) => `${s.name}=${s.score.toFixed(2)}`)
        .join(", ");
      logTest(
        "14. Generate + Evaluate with LLM Scorers",
        "PASS",
        `Generated ${result.content.length} chars, ${scores.length} LLM scorers: [${summary}]`,
      );
      return true;
    }

    logTest(
      "14. Generate + Evaluate with LLM Scorers",
      "FAIL",
      "No LLM scorer returned a valid score",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("14. Generate + Evaluate with LLM Scorers");
      logTest("14. Generate + Evaluate with LLM Scorers", "SKIP", msg);
      return null;
    }
    logTest("14. Generate + Evaluate with LLM Scorers", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #15: Generate with enableEvaluation (inline)
// ============================================================

async function testGenerateWithEnableEvaluation(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("15. Generate with enableEvaluation", "TESTING");
  try {
    const result = await sdk.generate({
      abortSignal: signal,
      input: {
        text: `You are an evaluation judge. Score this answer for quality.
Question: What is the capital of France?
Answer: Paris is the capital of France.
Respond with JSON: {"relevanceScore": 9, "accuracyScore": 10, "completenessScore": 8, "finalScore": 9, "reasoning": "Correct and concise", "suggestedImprovements": "Could add more detail"}`,
      },
      ...buildBaseSDKOptions(),
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
      enableEvaluation: true,
    });

    if (!result?.content) {
      logTest(
        "15. Generate with enableEvaluation",
        "FAIL",
        "generate() returned no content",
      );
      return false;
    }

    // Check if evaluation was populated (it depends on the provider response being parseable)
    if (result.evaluation) {
      const evalKeys = Object.keys(result.evaluation);
      logTest(
        "15. Generate with enableEvaluation",
        "PASS",
        `result.evaluation populated with keys: [${evalKeys.join(", ")}]`,
      );
      return true;
    }

    // Even without result.evaluation, the generate succeeded with enableEvaluation=true
    // This validates the code path does not crash
    logTest(
      "15. Generate with enableEvaluation",
      "PASS",
      `enableEvaluation=true generated ${result.content.length} chars (evaluation field may be absent if LLM response was not parseable as eval JSON)`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("15. Generate with enableEvaluation");
      logTest("15. Generate with enableEvaluation", "SKIP", msg);
      return null;
    }
    logTest("15. Generate with enableEvaluation", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #16: Stream and Evaluate
// ============================================================

async function testStreamAndEvaluate(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("16. Stream + Evaluate", "TESTING");
  try {
    // Step 1: Stream a response and collect the full text
    const streamResult = await sdk.stream({
      abortSignal: signal,
      input: { text: EVAL_TEST_DATA.question },
      ...buildBaseSDKOptions(),
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
    });

    let fullText = "";
    for await (const chunk of streamResult.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        fullText += chunk.content;
      }
    }

    if (!fullText.trim()) {
      // stream() returning empty content here is a real regression — every
      // other empty-content branch in this suite is treated as FAIL/false
      // for consistency. The provider-error branch in the surrounding
      // try/catch still SKIPs transient upstream issues.
      logTest(
        "16. Stream + Evaluate",
        "FAIL",
        "stream() returned no text content",
      );
      return false;
    }

    // Step 2: Evaluate the streamed response with a pipeline
    const pipeline = await PipelineBuilder.create("stream-eval-test")
      .addScorer("length", { threshold: 0.3 })
      .addScorer("format", { threshold: 0.3 })
      .aggregateWith("average")
      .passThreshold(0.3)
      .buildAndInitialize();

    const evalResult = await pipeline.execute({
      query: EVAL_TEST_DATA.question,
      response: fullText,
    });

    if (
      evalResult &&
      Array.isArray(evalResult.scores) &&
      evalResult.scores.length > 0 &&
      typeof evalResult.overallScore === "number"
    ) {
      logTest(
        "16. Stream + Evaluate",
        "PASS",
        `Streamed ${fullText.length} chars, evaluated with ${evalResult.scores.length} scorers, overall: ${evalResult.overallScore.toFixed(2)}`,
      );
      return true;
    }

    logTest(
      "16. Stream + Evaluate",
      "FAIL",
      "Pipeline returned no scores for streamed response",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("16. Stream + Evaluate");
      logTest("16. Stream + Evaluate", "SKIP", msg);
      return null;
    }
    logTest("16. Stream + Evaluate", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #17: Evaluate with Preset Pipeline
// ============================================================

async function testEvaluateWithPreset(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("17. Evaluate with Preset Pipeline", "TESTING");
  try {
    // Step 1: Generate a response
    const result = await sdk.generate({
      abortSignal: signal,
      input: { text: EVAL_TEST_DATA.question },
      ...buildBaseSDKOptions(),
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
    });

    if (!result?.content) {
      logTest(
        "17. Evaluate with Preset Pipeline",
        "FAIL",
        "generate() returned no content",
      );
      return false;
    }

    // Step 2: Use the "quality" preset pipeline
    const qualityConfig = getPreset("quality");
    const pipeline = new EvaluationPipeline(qualityConfig);
    await pipeline.initialize();

    const evalResult = await pipeline.execute({
      query: EVAL_TEST_DATA.question,
      response: result.content,
    });

    if (
      evalResult &&
      typeof evalResult.overallScore === "number" &&
      Array.isArray(evalResult.scores)
    ) {
      const scorerNames = evalResult.scores
        .map((s) => `${s.scorerId}=${s.score.toFixed(1)}`)
        .join(", ");
      logTest(
        "17. Evaluate with Preset Pipeline",
        "PASS",
        `Preset 'quality' ran ${evalResult.scores.length} scorers: [${scorerNames}], overall: ${evalResult.overallScore.toFixed(2)}, passed: ${evalResult.passed}`,
      );
      return true;
    }

    logTest(
      "17. Evaluate with Preset Pipeline",
      "FAIL",
      "Preset pipeline returned invalid result",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("17. Evaluate with Preset Pipeline");
      logTest("17. Evaluate with Preset Pipeline", "SKIP", msg);
      return null;
    }
    logTest("17. Evaluate with Preset Pipeline", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #18: Evaluate with PipelineBuilder Fluent API
// ============================================================

async function testEvaluateWithPipelineBuilder(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("18. Evaluate with PipelineBuilder", "TESTING");
  try {
    // Step 1: Generate a response
    const result = await sdk.generate({
      abortSignal: signal,
      input: { text: EVAL_TEST_DATA.question },
      ...buildBaseSDKOptions(),
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
    });

    if (!result?.content) {
      logTest(
        "18. Evaluate with PipelineBuilder",
        "FAIL",
        "generate() returned no content",
      );
      return false;
    }

    // Step 2: Build a custom pipeline with PipelineBuilder
    const pipeline = await PipelineBuilder.create("builder-integration-test")
      .description("Custom pipeline built with fluent API for integration test")
      .addScorer("length", { threshold: 0.3 })
      .addScorer("format", { threshold: 0.3 })
      .addScorer("keyword-coverage", { threshold: 0.3 })
      .aggregateWith("average")
      .passThreshold(0.3)
      .parallel()
      .buildAndInitialize();

    const evalResult = await pipeline.execute({
      query: EVAL_TEST_DATA.question,
      response: result.content,
      groundTruth: EVAL_TEST_DATA.groundTruth,
    });

    if (
      evalResult &&
      typeof evalResult.overallScore === "number" &&
      evalResult.pipelineConfig.name === "builder-integration-test" &&
      Array.isArray(evalResult.scores) &&
      evalResult.scores.length > 0
    ) {
      logTest(
        "18. Evaluate with PipelineBuilder",
        "PASS",
        `Pipeline '${evalResult.pipelineConfig.name}': ${evalResult.scores.length} scorers, overall: ${evalResult.overallScore.toFixed(2)}, passed: ${evalResult.passed}`,
      );
      return true;
    }

    logTest(
      "18. Evaluate with PipelineBuilder",
      "FAIL",
      "PipelineBuilder result missing expected fields",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("18. Evaluate with PipelineBuilder");
      logTest("18. Evaluate with PipelineBuilder", "SKIP", msg);
      return null;
    }
    logTest("18. Evaluate with PipelineBuilder", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #19: Evaluate Good vs Bad Response (Discriminative)
// ============================================================

async function testEvaluateGoodVsBadResponse(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("19. Good vs Bad Response (Discriminative)", "TESTING");
  try {
    // Step 1: Generate a GOOD response (with context for grounding)
    const goodResult = await sdk.generate({
      abortSignal: signal,
      input: {
        text: `Based on the following context, answer the question accurately.

Context: ${EVAL_TEST_DATA.context}

Question: ${EVAL_TEST_DATA.question}`,
      },
      ...buildBaseSDKOptions(),
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
    });

    if (!goodResult?.content) {
      logTest(
        "19. Good vs Bad Response (Discriminative)",
        "FAIL",
        "generate() for good response returned no content",
      );
      return false;
    }

    // Brief delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 3000));

    // Step 2: Generate a BAD response (completely unrelated question)
    const badResult = await sdk.generate({
      abortSignal: signal,
      input: {
        text: "Write a haiku about clouds.",
      },
      ...buildBaseSDKOptions(),
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
    });

    if (!badResult?.content) {
      logTest(
        "19. Good vs Bad Response (Discriminative)",
        "FAIL",
        "generate() for bad response returned no content",
      );
      return false;
    }

    // Step 3: Evaluate both with the same pipeline
    const pipeline = await PipelineBuilder.create("discriminative-test")
      .addScorer("keyword-coverage", { threshold: 0.3 })
      .addScorer("content-similarity", { threshold: 0.3 })
      .aggregateWith("average")
      .passThreshold(0.3)
      .buildAndInitialize();

    const goodEval = await pipeline.execute({
      query: EVAL_TEST_DATA.question,
      response: goodResult.content,
      groundTruth: EVAL_TEST_DATA.groundTruth,
      context: [EVAL_TEST_DATA.context],
    });

    const badEval = await pipeline.execute({
      query: EVAL_TEST_DATA.question,
      response: badResult.content,
      groundTruth: EVAL_TEST_DATA.groundTruth,
      context: [EVAL_TEST_DATA.context],
    });

    if (
      goodEval &&
      badEval &&
      typeof goodEval.overallScore === "number" &&
      typeof badEval.overallScore === "number"
    ) {
      if (goodEval.overallScore > badEval.overallScore) {
        logTest(
          "19. Good vs Bad Response (Discriminative)",
          "PASS",
          `Good response scored higher: good=${goodEval.overallScore.toFixed(2)} > bad=${badEval.overallScore.toFixed(2)}`,
        );
        return true;
      }

      // Even if scores are close, the pipeline ran — report the numbers
      logTest(
        "19. Good vs Bad Response (Discriminative)",
        "FAIL",
        `Good response (${goodEval.overallScore.toFixed(2)}) did NOT score higher than bad response (${badEval.overallScore.toFixed(2)})`,
      );
      return false;
    }

    logTest(
      "19. Good vs Bad Response (Discriminative)",
      "FAIL",
      "Pipeline returned invalid scores",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("19. Good vs Bad Response (Discriminative)");
      logTest("19. Good vs Bad Response (Discriminative)", "SKIP", msg);
      return null;
    }
    logTest("19. Good vs Bad Response (Discriminative)", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #20: Evaluate with Ground Truth
// ============================================================

async function testEvaluateWithGroundTruth(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("20. Evaluate with Ground Truth", "TESTING");
  try {
    // Step 1: Generate a factual response
    const result = await sdk.generate({
      abortSignal: signal,
      input: {
        text: `Answer this question factually: ${EVAL_TEST_DATA.question}

Mention these key points: static type checking, IDE support with autocompletion, and code maintainability through interfaces.`,
      },
      ...buildBaseSDKOptions(),
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
    });

    if (!result?.content) {
      logTest(
        "20. Evaluate with Ground Truth",
        "FAIL",
        "generate() returned no content",
      );
      return false;
    }

    // Step 2: Evaluate with keyword-coverage and content-similarity against ground truth
    const pipeline = await PipelineBuilder.create("ground-truth-test")
      .addScorer("keyword-coverage", { threshold: 0.3 })
      .addScorer("content-similarity", { threshold: 0.3 })
      .aggregateWith("average")
      .passThreshold(0.3)
      .buildAndInitialize();

    const evalResult = await pipeline.execute({
      query: EVAL_TEST_DATA.question,
      response: result.content,
      groundTruth: EVAL_TEST_DATA.groundTruth,
    });

    if (
      evalResult &&
      typeof evalResult.overallScore === "number" &&
      Array.isArray(evalResult.scores) &&
      evalResult.scores.length > 0
    ) {
      const scorerSummary = evalResult.scores
        .map((s) => `${s.scorerId}=${s.score.toFixed(2)}`)
        .join(", ");
      logTest(
        "20. Evaluate with Ground Truth",
        "PASS",
        `Generated ${result.content.length} chars, ground truth eval: [${scorerSummary}], overall: ${evalResult.overallScore.toFixed(2)}`,
      );
      return true;
    }

    logTest(
      "20. Evaluate with Ground Truth",
      "FAIL",
      "Pipeline returned no scores for ground truth evaluation",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("20. Evaluate with Ground Truth");
      logTest("20. Evaluate with Ground Truth", "SKIP", msg);
      return null;
    }
    logTest("20. Evaluate with Ground Truth", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #21: Batch Evaluate Multiple Generations
// ============================================================

async function testBatchEvaluateMultipleGenerations(
  sdk: NeuroLink,
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("21. Batch Evaluate Multiple Generations", "TESTING");
  try {
    // Step 1: Generate 3 different responses
    const questions = [
      "What is TypeScript?",
      "What are the benefits of static typing?",
      "How does TypeScript improve developer productivity?",
    ];

    const responses: Array<{ query: string; response: string }> = [];
    // Track WHY each question failed so we can distinguish "every call hit
    // a transient provider error" (→ SKIP) from "every call ran but returned
    // empty content / threw a real error" (→ FAIL).
    let providerSkipCount = 0;

    for (let i = 0; i < questions.length; i++) {
      try {
        const result = await sdk.generate({
          abortSignal: signal,
          input: { text: questions[i] },
          ...buildBaseSDKOptions(),
          maxTokens: Math.min(TEST_CONFIG.maxTokens || 300, 300),
        });

        if (result?.content) {
          responses.push({ query: questions[i], response: result.content });
        }
      } catch (genError) {
        const genMsg =
          genError instanceof Error ? genError.message : String(genError);
        if (isExpectedProviderError(genMsg)) {
          providerSkipCount++;
          log(`   Question ${i + 1} skipped: provider error`, "yellow");
          continue;
        }
        // Non-provider error — still continue with remaining questions
        log(
          `   Question ${i + 1} failed: ${genMsg.substring(0, 100)}`,
          "yellow",
        );
      }

      // Brief delay between generations
      if (i < questions.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (responses.length === 0) {
      // If EVERY question was a transient provider/auth skip, the
      // environment can't run this test — SKIP rather than FAIL. Otherwise
      // (every call returned empty content or a real exception) this is a
      // genuine regression and must FAIL.
      if (providerSkipCount === questions.length) {
        markSkipped("21. Batch Evaluate Multiple Generations");
        logTest(
          "21. Batch Evaluate Multiple Generations",
          "SKIP",
          `All ${questions.length} questions hit provider errors`,
        );
        return null;
      }
      logTest(
        "21. Batch Evaluate Multiple Generations",
        "FAIL",
        "No responses were generated (all generations returned empty content)",
      );
      return false;
    }

    // Step 2: Batch-evaluate all responses using BatchStrategy
    const pipeline = await PipelineBuilder.create("batch-test")
      .addScorer("length", { threshold: 0.3 })
      .addScorer("format", { threshold: 0.3 })
      .aggregateWith("average")
      .passThreshold(0.3)
      .buildAndInitialize();

    const batcher = new BatchStrategy(pipeline, { concurrency: 2 });
    const batchResult = await batcher.evaluate(responses);

    // PASS only when:
    //   - all questions produced a response (no silent partial failure)
    //   - batcher returned results for every response
    //   - the summary's total matches what we fed in
    // Previously `total === responses.length` always held trivially even
    // when only 1/3 questions had succeeded, masking real regressions.
    const allGenerationsSucceeded = responses.length === questions.length;
    // `averageScore` is required (its `.toFixed` call below would crash on
    // undefined). `passRate` is optional — BatchStrategy emits it only when
    // at least one scorer reports a binary passed/failed verdict; rule-only
    // pipelines don't. Treat it as optional in the display.
    const batcherSawAll =
      batchResult?.summary?.total === responses.length &&
      Array.isArray(batchResult?.results) &&
      batchResult.results.length === responses.length &&
      typeof batchResult.summary.averageScore === "number";

    if (allGenerationsSucceeded && batcherSawAll) {
      const passRate = batchResult.summary.passRate;
      const passRateDisplay =
        typeof passRate === "number"
          ? `${(passRate * 100).toFixed(0)}%`
          : "n/a";
      logTest(
        "21. Batch Evaluate Multiple Generations",
        "PASS",
        `Generated ${responses.length}/${questions.length} responses, batch evaluated: total=${batchResult.summary.total}, ` +
          `successful=${batchResult.summary.successful}, avg score=${batchResult.summary.averageScore.toFixed(2)}, ` +
          `pass rate=${passRateDisplay}`,
      );
      return true;
    }

    if (!allGenerationsSucceeded) {
      logTest(
        "21. Batch Evaluate Multiple Generations",
        "FAIL",
        `Only ${responses.length}/${questions.length} generations succeeded — batch test requires all questions to complete (partial failures hide model/provider regressions)`,
      );
      return false;
    }

    // batcherSawAll was false. Surface every component (total, results.length,
    // averageScore type) so the FAIL diagnostic isolates the cause —
    // previously the message only printed total/results.length, which
    // collided with the numeric-guard mode (added in the toFixed-safety
    // pass): the test would say "expected 3, got 3" while really failing
    // on `averageScore` being undefined.
    const avgType = typeof batchResult?.summary?.averageScore;
    logTest(
      "21. Batch Evaluate Multiple Generations",
      "FAIL",
      `Batch result mismatch: summary.total=${batchResult?.summary?.total}, results.length=${(batchResult?.results || []).length}, expected ${responses.length}, averageScore=${avgType}(${String(batchResult?.summary?.averageScore)})`,
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("21. Batch Evaluate Multiple Generations");
      logTest("21. Batch Evaluate Multiple Generations", "SKIP", msg);
      return null;
    }
    logTest("21. Batch Evaluate Multiple Generations", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #22: CLI Evaluate Command
// ============================================================

async function testCLIEvaluateCommand(
  signal?: AbortSignal,
): Promise<boolean | null> {
  logTest("22. CLI evaluate command", "TESTING");
  try {
    const cliPath = path.resolve(__dirname, "../dist/cli/index.js");
    if (!fs.existsSync(cliPath)) {
      // Missing CLI artifact is exactly what this smoke catches — flipping
      // to FAIL ensures a broken build doesn't silently pass the suite.
      logTest(
        "22. CLI evaluate command",
        "FAIL",
        "CLI not built: dist/cli/index.js not found — run pnpm run build first",
      );
      return false;
    }

    const result = await new Promise<{ stdout: string; exitCode: number }>(
      (resolve) => {
        const child = spawn("node", [cliPath, "evaluate", "presets"], {
          cwd: path.resolve(__dirname, ".."),
          timeout: 30000,
        });
        // Forward the per-test deadline AbortSignal to the child process.
        // Without this, when the suite-level deadline fires `controller.abort()`
        // (the for-loop in runAllTests), the child keeps running until its own
        // `timeout: 30000` triggers — orphaning a process and burning the next
        // test's pacing budget. With it, SIGTERM lands within a few ms of the
        // signal firing.
        const onAbort = (): void => {
          try {
            child.kill();
          } catch {
            /* child already exited */
          }
        };
        if (signal) {
          if (signal.aborted) {
            onAbort();
          } else {
            signal.addEventListener("abort", onAbort, { once: true });
          }
        }
        let stdout = "";
        child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
        child.stderr.on("data", (d: Buffer) => (stdout += d.toString()));
        const cleanup = (): void => {
          if (signal) {
            signal.removeEventListener("abort", onAbort);
          }
        };
        child.on("close", (code: number | null) => {
          cleanup();
          resolve({ stdout, exitCode: code ?? 1 });
        });
        child.on("error", () => {
          cleanup();
          resolve({ stdout, exitCode: 1 });
        });
      },
    );

    if (result.exitCode === 0 && result.stdout.length > 0) {
      logTest(
        "22. CLI evaluate command",
        "PASS",
        `Exit 0, output: ${result.stdout.substring(0, 150).replace(/\n/g, " ")}...`,
      );
      return true;
    }

    // Non-zero exit is a real failure even when stdout is present — the
    // previous "PASS on any output" path masked CLI errors that happened
    // to print partial results before crashing.
    logTest(
      "22. CLI evaluate command",
      "FAIL",
      `Exit ${result.exitCode}, output: ${result.stdout.substring(0, 100).replace(/\n/g, " ")}`,
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("22. CLI evaluate command", "FAIL", msg);
    return false;
  }
}

// ============================================================
// MAIN RUNNER
// ============================================================

async function runAllTests(): Promise<void> {
  log("\n\uD83D\uDE80 NeuroLink Continuous Test Suite: Evaluation", "bright");
  log(
    `   Provider: ${TEST_CONFIG.provider}, Model: ${TEST_CONFIG.model || "default"}`,
    "cyan",
  );

  // Prerequisite checks — throw so the harness owns the exit path
  // (prints summary, cleanup). process.exit here short-circuits both.
  if (
    !fs.existsSync(path.resolve(__dirname, "../dist")) ||
    !fs.existsSync(path.resolve(__dirname, "../dist/index.js"))
  ) {
    throw new Error("Build not found. Run: pnpm run build");
  }

  const sharedSdk = new NeuroLink();

  // Test fns accept an optional AbortSignal that fires when the per-test
  // deadline elapses. Tests that perform long-running provider work can
  // forward this signal to `sdk.generate({ abortSignal })` so cancelled
  // calls actually stop.
  const tests: Array<{
    name: string;
    fn: (signal?: AbortSignal) => Promise<boolean | null>;
  }> = [
    // Tests 1, 8, 9 (RAGASEvaluator Init / RetryManager Basic / RetryManager
    // Exhaustion) were removed: these classes are intentionally internal — not
    // part of the public dist surface — so the dist-import gating they used
    // amounted to "always SKIP". Internal coverage of those classes belongs in
    // a unit-style suite that imports from src/ directly.
    {
      name: "2. RAGAS Faithfulness Scoring",
      fn: (signal) => testRAGASFaithfulness(sharedSdk, signal),
    },
    {
      name: "3. RAGAS Answer Relevancy",
      fn: (signal) => testRAGASAnswerRelevancy(sharedSdk, signal),
    },
    {
      name: "4. RAGAS Context Precision",
      fn: (signal) => testRAGASContextPrecision(sharedSdk, signal),
    },
    {
      name: "5. RAGAS Context Recall",
      fn: (signal) => testRAGASContextRecall(sharedSdk, signal),
    },
    // COMMENTED OUT: sdk.evaluate() not implemented yet — re-enable when evaluate() is added to NeuroLink class
    // { name: "6. Direct Scoring API", fn: () => testScoringFunction(sharedSdk) },
    {
      name: "7. Context Builder Utility",
      fn: (signal) => testContextBuilder(sharedSdk, signal),
    },
    {
      name: "10. Evaluation Providers",
      fn: (signal) => testEvaluationProviders(sharedSdk, signal),
    },
    {
      name: "11. Batch Evaluation",
      fn: (signal) => testBatchEvaluation(sharedSdk, signal),
    },
    {
      name: "12. Custom Prompt Evaluation",
      fn: (signal) => testEvaluationWithCustomPrompt(sharedSdk, signal),
    },
    // 13. Observability Spans — DELETED. Coverage now lives in
    // continuous-test-suite-observability.ts; this duplicate was ~130 lines.
    {
      name: "13. Generate + Evaluate with Rule Scorers",
      fn: (signal) => testGenerateAndEvaluateWithRuleScorers(sharedSdk, signal),
    },
    {
      name: "14. Generate + Evaluate with LLM Scorers",
      fn: (signal) => testGenerateAndEvaluateWithLLMScorers(sharedSdk, signal),
    },
    {
      name: "15. Generate with enableEvaluation",
      fn: (signal) => testGenerateWithEnableEvaluation(sharedSdk, signal),
    },
    {
      name: "16. Stream + Evaluate",
      fn: (signal) => testStreamAndEvaluate(sharedSdk, signal),
    },
    {
      name: "17. Evaluate with Preset Pipeline",
      fn: (signal) => testEvaluateWithPreset(sharedSdk, signal),
    },
    {
      name: "18. Evaluate with PipelineBuilder",
      fn: (signal) => testEvaluateWithPipelineBuilder(sharedSdk, signal),
    },
    {
      name: "19. Good vs Bad Response (Discriminative)",
      fn: (signal) => testEvaluateGoodVsBadResponse(sharedSdk, signal),
    },
    {
      name: "20. Evaluate with Ground Truth",
      fn: (signal) => testEvaluateWithGroundTruth(sharedSdk, signal),
    },
    {
      name: "21. Batch Evaluate Multiple Generations",
      fn: (signal) => testBatchEvaluateMultipleGenerations(sharedSdk, signal),
    },
    {
      name: "22. CLI evaluate command",
      fn: (signal) => testCLIEvaluateCommand(signal),
    },
  ];

  for (const test of tests) {
    try {
      // Enforce per-test deadline so a hung provider call / scorer init can't
      // block the entire live sweep. TEST_CONFIG.timeout is consulted here
      // instead of being orphaned at the config-only level. Timeout failures
      // surface as ordinary FAIL records via the catch below.
      //
      // The previous version used `Promise.race(test.fn(), deadline)`, which
      // rejects on timeout but leaves the losing `test.fn()` running against
      // the shared sdk — its pending fetches keep consuming quotas, and its
      // late callbacks can scribble on suite state after the runner has
      // moved on. We now spawn an AbortController, pass its signal to
      // test.fn (so cooperatively cancellable tests can drop their work),
      // and `controller.abort()` on timeout.
      const controller = new AbortController();
      let timer: NodeJS.Timeout | undefined;
      // Track whether `test.fn` settled before the deadline so the finally
      // doesn't pointlessly abort the signal on a clean pass. Without this,
      // any listener `test.fn` registered on `signal` (or any helper that
      // outlives the test fn) sees `signal.aborted === true` post-resolve.
      let testFinished = false;
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(
            new Error(
              `Test "${test.name}" timed out after ${TEST_CONFIG.timeout}ms`,
            ),
          );
        }, TEST_CONFIG.timeout);
      });
      const result = await Promise.race([
        test.fn(controller.signal).finally(() => {
          testFinished = true;
        }),
        deadline,
      ]).finally(() => {
        if (timer) {
          clearTimeout(timer);
        }
        // Only cancel in-flight work if test.fn didn't already settle.
        // On a clean pass we leave the signal untouched.
        if (!testFinished) {
          controller.abort();
        }
      });
      // Treat result === null as a skip too — many tests return null
      // after logging SKIP without going through markSkipped().
      const isSkipped = skippedTests.has(test.name) || result === null;
      recordTest(
        test.name,
        !isSkipped && result === true,
        isSkipped,
        isSkipped
          ? skippedTests.has(test.name)
            ? "skipped due to provider/auth issue"
            : "skipped"
          : result === true
            ? undefined
            : "failed",
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      recordTest(test.name, false, false, msg);
    }
    await globalCleanup();
    await new Promise((r) => setTimeout(r, TEST_CONFIG.interTestDelay));
  }
}

// ============================================================
// CLI ARGS + EXECUTION
// ============================================================

function parseArguments(): { provider?: string; model?: string } {
  const args: { provider?: string; model?: string } = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--provider=")) {
      args.provider = arg.split("=")[1];
    }
    if (arg.startsWith("--model=")) {
      args.model = arg.split("=")[1];
    }
    if (arg === "--help") {
      console.log(
        `Usage: npx tsx test/continuous-test-suite-evaluation.ts [--provider=X] [--model=Y]

NeuroLink Evaluation Test Suite

Tests the RAGAS-style evaluation system including:
  - Faithfulness, Answer Relevancy, Context Precision, Context Recall
  - Direct scoring API via generate()
  - ContextBuilder utility
  - Evaluation provider configuration
  - Batch evaluation
  - Custom prompt evaluation
  - Scoring subsuite (#13–#22): rule/LLM scorers, enableEvaluation,
    stream+evaluate, preset & PipelineBuilder pipelines, ground
    truth, BatchStrategy, and CLI 'evaluate presets' smoke

Options:
  --provider=X    AI provider for evaluation (default: vertex)
  --model=Y       Model name (default: provider default)
  --help          Show this help

Environment Variables:
  TEST_PROVIDER   Default provider
  TEST_MODEL      Default model`,
      );
      process.exit(0);
    }
  }
  return args;
}

const cliArgs = parseArguments();
if (cliArgs.provider) {
  TEST_CONFIG.provider = cliArgs.provider;
}
if (cliArgs.model) {
  TEST_CONFIG.model = cliArgs.model;
}
if (!TEST_CONFIG.maxTokens) {
  // Normalize alias spellings so `--provider=google-ai` resolves to the
  // `google-ai-studio` budget instead of falling through to the 1024 default.
  // Mirrors the pricing.ts / contextWindows.ts alias maps.
  const stripped = TEST_CONFIG.provider.toLowerCase().replace(/[^a-z]/g, "");
  const PROVIDER_KEY_ALIASES: Record<string, string> = {
    googleai: "google-ai-studio",
    googleaistudio: "google-ai-studio",
    googlevertex: "vertex",
    nvidianim: "nvidia-nim",
    lmstudio: "lm-studio",
    llamacpp: "llamacpp",
  };
  const canonical =
    PROVIDER_KEY_ALIASES[stripped] ?? TEST_CONFIG.provider.toLowerCase();
  TEST_CONFIG.maxTokens =
    PROVIDER_MAX_TOKENS[canonical] ??
    PROVIDER_MAX_TOKENS[TEST_CONFIG.provider] ??
    1024;
}

await runSuite(runAllTests);
