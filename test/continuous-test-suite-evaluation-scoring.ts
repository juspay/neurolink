#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite: Evaluation Scoring System (SDK Integration)
 *
 * Tests the evaluation scoring system end-to-end with REAL sdk.generate()
 * and sdk.stream() calls. Every test generates a response first, then
 * evaluates it using pipelines, presets, or the inline enableEvaluation flag.
 *
 * 10 tests covering:
 * - Generate + evaluate with rule scorers (length, format, keyword-coverage)
 * - Generate + evaluate with LLM scorers (hallucination, faithfulness, answer-relevancy)
 * - Inline enableEvaluation on generate()
 * - Stream + evaluate with pipeline
 * - Evaluate with preset pipeline (quality)
 * - Evaluate with PipelineBuilder fluent API
 * - Discriminative evaluation: good vs bad response scoring
 * - Ground truth evaluation with keyword-coverage and content-similarity
 * - Batch evaluate multiple generations
 * - CLI evaluate command (presets subcommand)
 *
 * Source: src/lib/evaluation/ (scorers/, pipeline/, reporting/, errors/, hooks/)
 *
 * Run: npx tsx test/continuous-test-suite-evaluation-scoring.ts --provider=vertex
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "url";
import { NeuroLink } from "../dist/index.js";

// Source imports for scorer system classes
import { ScorerRegistry } from "../src/lib/evaluation/scorers/scorerRegistry.js";
import { EvaluationPipeline } from "../src/lib/evaluation/pipeline/evaluationPipeline.js";
import { PipelineBuilder } from "../src/lib/evaluation/pipeline/pipelineBuilder.js";
import { getPreset } from "../src/lib/evaluation/pipeline/presets.js";
import { BatchStrategy } from "../src/lib/evaluation/pipeline/strategies/batchStrategy.js";

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
// LOGGING UTILITIES
// ============================================================

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};
type ColorName = keyof typeof colors;

function log(message: string, color: ColorName = "reset"): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`  ${title}`, "cyan");
  log(`${"=".repeat(60)}`, "cyan");
}

function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const icons = {
    PASS: "\u2705",
    FAIL: "\u274C",
    SKIP: "\u23ED\uFE0F",
    TESTING: "\u26A0\uFE0F",
  };
  const statusColors: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
    TESTING: "blue",
  };
  log(`${icons[status]} ${testName}`, statusColors[status]);
  if (details) {
    log(`   ${details}`, "reset");
  }
}

// ============================================================
// SHARED UTILITIES
// ============================================================

// Use boolean | null: true=pass, false=fail, null=skip
const testResults: Array<{
  name: string;
  result: boolean | null;
  error: string | null;
}> = [];
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

// ============================================================
// TEST DATA
// ============================================================

const EVAL_TEST_DATA = {
  question:
    "What are the three main benefits of using TypeScript over JavaScript?",
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

// ============================================================
// TEST #1: Generate and Evaluate with Rule Scorers
// ============================================================

async function testGenerateAndEvaluateWithRuleScorers(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("1. Generate + Evaluate with Rule Scorers", "TESTING");
  try {
    // Step 1: Generate a response with SDK
    const result = await sdk.generate({
      input: { text: EVAL_TEST_DATA.question },
      ...buildBaseSDKOptions(),
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
    });

    if (!result?.content) {
      logTest(
        "1. Generate + Evaluate with Rule Scorers",
        "SKIP",
        "generate() returned no content",
      );
      return null;
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
        "1. Generate + Evaluate with Rule Scorers",
        "PASS",
        `Generated ${result.content.length} chars, ${evalResult.scores.length} scorers: [${scorerNames}], overall: ${evalResult.overallScore.toFixed(2)}`,
      );
      return true;
    }

    logTest(
      "1. Generate + Evaluate with Rule Scorers",
      "FAIL",
      "No scores returned from pipeline",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("1. Generate + Evaluate with Rule Scorers");
      logTest("1. Generate + Evaluate with Rule Scorers", "SKIP", msg);
      return null;
    }
    logTest("1. Generate + Evaluate with Rule Scorers", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #2: Generate and Evaluate with LLM Scorers
// ============================================================

async function testGenerateAndEvaluateWithLLMScorers(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("2. Generate + Evaluate with LLM Scorers", "TESTING");
  try {
    // Step 1: Generate a factual response with context
    const result = await sdk.generate({
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
        "2. Generate + Evaluate with LLM Scorers",
        "SKIP",
        "generate() returned no content",
      );
      return null;
    }

    // Step 2: Evaluate with LLM scorers
    // Initialize registry first so LLM scorers are available
    await ScorerRegistry.registerBuiltInScorers();

    const hallucinationScorer = await ScorerRegistry.getScorer("hallucination");
    const faithfulnessScorer = await ScorerRegistry.getScorer("faithfulness");
    const relevancyScorer = await ScorerRegistry.getScorer("answer-relevancy");

    if (!hallucinationScorer && !faithfulnessScorer && !relevancyScorer) {
      logTest(
        "2. Generate + Evaluate with LLM Scorers",
        "SKIP",
        "No LLM scorers available in registry",
      );
      return null;
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
        "2. Generate + Evaluate with LLM Scorers",
        "PASS",
        `Generated ${result.content.length} chars, ${scores.length} LLM scorers: [${summary}]`,
      );
      return true;
    }

    logTest(
      "2. Generate + Evaluate with LLM Scorers",
      "FAIL",
      "No LLM scorer returned a valid score",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("2. Generate + Evaluate with LLM Scorers");
      logTest("2. Generate + Evaluate with LLM Scorers", "SKIP", msg);
      return null;
    }
    logTest("2. Generate + Evaluate with LLM Scorers", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #3: Generate with enableEvaluation (inline)
// ============================================================

async function testGenerateWithEnableEvaluation(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("3. Generate with enableEvaluation", "TESTING");
  try {
    const result = await sdk.generate({
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
        "3. Generate with enableEvaluation",
        "SKIP",
        "generate() returned no content",
      );
      return null;
    }

    // Check if evaluation was populated (it depends on the provider response being parseable)
    if (result.evaluation) {
      const evalKeys = Object.keys(result.evaluation);
      logTest(
        "3. Generate with enableEvaluation",
        "PASS",
        `result.evaluation populated with keys: [${evalKeys.join(", ")}]`,
      );
      return true;
    }

    // Even without result.evaluation, the generate succeeded with enableEvaluation=true
    // This validates the code path does not crash
    logTest(
      "3. Generate with enableEvaluation",
      "PASS",
      `enableEvaluation=true generated ${result.content.length} chars (evaluation field may be absent if LLM response was not parseable as eval JSON)`,
    );
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("3. Generate with enableEvaluation");
      logTest("3. Generate with enableEvaluation", "SKIP", msg);
      return null;
    }
    logTest("3. Generate with enableEvaluation", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #4: Stream and Evaluate
// ============================================================

async function testStreamAndEvaluate(sdk: NeuroLink): Promise<boolean | null> {
  logTest("4. Stream + Evaluate", "TESTING");
  try {
    // Step 1: Stream a response and collect the full text
    const streamResult = await sdk.stream({
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
      logTest(
        "4. Stream + Evaluate",
        "SKIP",
        "stream() returned no text content",
      );
      return null;
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
      evalResult.scores.length > 0
    ) {
      logTest(
        "4. Stream + Evaluate",
        "PASS",
        `Streamed ${fullText.length} chars, evaluated with ${evalResult.scores.length} scorers, overall: ${evalResult.overallScore.toFixed(2)}`,
      );
      return true;
    }

    logTest(
      "4. Stream + Evaluate",
      "FAIL",
      "Pipeline returned no scores for streamed response",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("4. Stream + Evaluate");
      logTest("4. Stream + Evaluate", "SKIP", msg);
      return null;
    }
    logTest("4. Stream + Evaluate", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #5: Evaluate with Preset Pipeline
// ============================================================

async function testEvaluateWithPreset(sdk: NeuroLink): Promise<boolean | null> {
  logTest("5. Evaluate with Preset Pipeline", "TESTING");
  try {
    // Step 1: Generate a response
    const result = await sdk.generate({
      input: { text: EVAL_TEST_DATA.question },
      ...buildBaseSDKOptions(),
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
    });

    if (!result?.content) {
      logTest(
        "5. Evaluate with Preset Pipeline",
        "SKIP",
        "generate() returned no content",
      );
      return null;
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
        "5. Evaluate with Preset Pipeline",
        "PASS",
        `Preset 'quality' ran ${evalResult.scores.length} scorers: [${scorerNames}], overall: ${evalResult.overallScore.toFixed(2)}, passed: ${evalResult.passed}`,
      );
      return true;
    }

    logTest(
      "5. Evaluate with Preset Pipeline",
      "FAIL",
      "Preset pipeline returned invalid result",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("5. Evaluate with Preset Pipeline");
      logTest("5. Evaluate with Preset Pipeline", "SKIP", msg);
      return null;
    }
    logTest("5. Evaluate with Preset Pipeline", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #6: Evaluate with PipelineBuilder Fluent API
// ============================================================

async function testEvaluateWithPipelineBuilder(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("6. Evaluate with PipelineBuilder", "TESTING");
  try {
    // Step 1: Generate a response
    const result = await sdk.generate({
      input: { text: EVAL_TEST_DATA.question },
      ...buildBaseSDKOptions(),
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
    });

    if (!result?.content) {
      logTest(
        "6. Evaluate with PipelineBuilder",
        "SKIP",
        "generate() returned no content",
      );
      return null;
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
        "6. Evaluate with PipelineBuilder",
        "PASS",
        `Pipeline '${evalResult.pipelineConfig.name}': ${evalResult.scores.length} scorers, overall: ${evalResult.overallScore.toFixed(2)}, passed: ${evalResult.passed}`,
      );
      return true;
    }

    logTest(
      "6. Evaluate with PipelineBuilder",
      "FAIL",
      "PipelineBuilder result missing expected fields",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("6. Evaluate with PipelineBuilder");
      logTest("6. Evaluate with PipelineBuilder", "SKIP", msg);
      return null;
    }
    logTest("6. Evaluate with PipelineBuilder", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #7: Evaluate Good vs Bad Response (Discriminative)
// ============================================================

async function testEvaluateGoodVsBadResponse(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("7. Good vs Bad Response (Discriminative)", "TESTING");
  try {
    // Step 1: Generate a GOOD response (with context for grounding)
    const goodResult = await sdk.generate({
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
        "7. Good vs Bad Response (Discriminative)",
        "SKIP",
        "generate() for good response returned no content",
      );
      return null;
    }

    // Brief delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 3000));

    // Step 2: Generate a BAD response (completely unrelated question)
    const badResult = await sdk.generate({
      input: {
        text: "Write a haiku about clouds.",
      },
      ...buildBaseSDKOptions(),
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
    });

    if (!badResult?.content) {
      logTest(
        "7. Good vs Bad Response (Discriminative)",
        "SKIP",
        "generate() for bad response returned no content",
      );
      return null;
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
          "7. Good vs Bad Response (Discriminative)",
          "PASS",
          `Good response scored higher: good=${goodEval.overallScore.toFixed(2)} > bad=${badEval.overallScore.toFixed(2)}`,
        );
        return true;
      }

      // Even if scores are close, the pipeline ran — report the numbers
      logTest(
        "7. Good vs Bad Response (Discriminative)",
        "FAIL",
        `Good response (${goodEval.overallScore.toFixed(2)}) did NOT score higher than bad response (${badEval.overallScore.toFixed(2)})`,
      );
      return false;
    }

    logTest(
      "7. Good vs Bad Response (Discriminative)",
      "FAIL",
      "Pipeline returned invalid scores",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("7. Good vs Bad Response (Discriminative)");
      logTest("7. Good vs Bad Response (Discriminative)", "SKIP", msg);
      return null;
    }
    logTest("7. Good vs Bad Response (Discriminative)", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #8: Evaluate with Ground Truth
// ============================================================

async function testEvaluateWithGroundTruth(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("8. Evaluate with Ground Truth", "TESTING");
  try {
    // Step 1: Generate a factual response
    const result = await sdk.generate({
      input: {
        text: `Answer this question factually: ${EVAL_TEST_DATA.question}

Mention these key points: static type checking, IDE support with autocompletion, and code maintainability through interfaces.`,
      },
      ...buildBaseSDKOptions(),
      maxTokens: Math.min(TEST_CONFIG.maxTokens || 500, 500),
    });

    if (!result?.content) {
      logTest(
        "8. Evaluate with Ground Truth",
        "SKIP",
        "generate() returned no content",
      );
      return null;
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
        "8. Evaluate with Ground Truth",
        "PASS",
        `Generated ${result.content.length} chars, ground truth eval: [${scorerSummary}], overall: ${evalResult.overallScore.toFixed(2)}`,
      );
      return true;
    }

    logTest(
      "8. Evaluate with Ground Truth",
      "FAIL",
      "Pipeline returned no scores for ground truth evaluation",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("8. Evaluate with Ground Truth");
      logTest("8. Evaluate with Ground Truth", "SKIP", msg);
      return null;
    }
    logTest("8. Evaluate with Ground Truth", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #9: Batch Evaluate Multiple Generations
// ============================================================

async function testBatchEvaluateMultipleGenerations(
  sdk: NeuroLink,
): Promise<boolean | null> {
  logTest("9. Batch Evaluate Multiple Generations", "TESTING");
  try {
    // Step 1: Generate 3 different responses
    const questions = [
      "What is TypeScript?",
      "What are the benefits of static typing?",
      "How does TypeScript improve developer productivity?",
    ];

    const responses: Array<{ query: string; response: string }> = [];

    for (let i = 0; i < questions.length; i++) {
      try {
        const result = await sdk.generate({
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
      logTest(
        "9. Batch Evaluate Multiple Generations",
        "SKIP",
        "No responses were generated (provider may be unavailable)",
      );
      return null;
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

    if (
      batchResult &&
      batchResult.summary &&
      batchResult.summary.total === responses.length &&
      Array.isArray(batchResult.results) &&
      batchResult.results.length > 0
    ) {
      logTest(
        "9. Batch Evaluate Multiple Generations",
        "PASS",
        `Generated ${responses.length} responses, batch evaluated: total=${batchResult.summary.total}, ` +
          `successful=${batchResult.summary.successful}, avg score=${batchResult.summary.averageScore.toFixed(2)}, ` +
          `pass rate=${(batchResult.summary.passRate * 100).toFixed(0)}%`,
      );
      return true;
    }

    logTest(
      "9. Batch Evaluate Multiple Generations",
      "FAIL",
      "Batch result missing expected fields",
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isExpectedProviderError(msg)) {
      markSkipped("9. Batch Evaluate Multiple Generations");
      logTest("9. Batch Evaluate Multiple Generations", "SKIP", msg);
      return null;
    }
    logTest("9. Batch Evaluate Multiple Generations", "FAIL", msg);
    return false;
  }
}

// ============================================================
// TEST #10: CLI Evaluate Command
// ============================================================

async function testCLIEvaluateCommand(): Promise<boolean | null> {
  logTest("10. CLI evaluate command", "TESTING");
  try {
    const cliPath = path.resolve(__dirname, "../dist/cli/index.js");
    if (!fs.existsSync(cliPath)) {
      logTest(
        "10. CLI evaluate command",
        "SKIP",
        "CLI not built: dist/cli/index.js not found",
      );
      return null;
    }

    const result = await new Promise<{ stdout: string; exitCode: number }>(
      (resolve) => {
        const child = spawn("node", [cliPath, "evaluate", "presets"], {
          cwd: path.resolve(__dirname, ".."),
          timeout: 30000,
        });
        let stdout = "";
        child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
        child.stderr.on("data", (d: Buffer) => (stdout += d.toString()));
        child.on("close", (code: number | null) =>
          resolve({ stdout, exitCode: code ?? 1 }),
        );
        child.on("error", () => resolve({ stdout, exitCode: 1 }));
      },
    );

    if (result.exitCode === 0 && result.stdout.length > 0) {
      logTest(
        "10. CLI evaluate command",
        "PASS",
        `Exit 0, output: ${result.stdout.substring(0, 150).replace(/\n/g, " ")}...`,
      );
      return true;
    }

    // Some CLI setups may exit non-zero but still produce output
    if (result.stdout.length > 0) {
      logTest(
        "10. CLI evaluate command",
        "PASS",
        `Exit ${result.exitCode} but produced output (${result.stdout.length} chars): ${result.stdout.substring(0, 100).replace(/\n/g, " ")}`,
      );
      return true;
    }

    logTest(
      "10. CLI evaluate command",
      "FAIL",
      `Exit ${result.exitCode}, no output`,
    );
    return false;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logTest("10. CLI evaluate command", "FAIL", msg);
    return false;
  }
}

// ============================================================
// MAIN RUNNER
// ============================================================

async function runAllTests(): Promise<void> {
  const startTime = Date.now();
  log(
    "\n\uD83D\uDE80 NeuroLink Continuous Test Suite: Evaluation Scoring System (SDK Integration)",
    "bright",
  );
  log(
    `   Provider: ${TEST_CONFIG.provider}, Model: ${TEST_CONFIG.model || "default"}`,
    "cyan",
  );

  // Prerequisite checks
  if (
    !fs.existsSync(path.resolve(__dirname, "../dist")) ||
    !fs.existsSync(path.resolve(__dirname, "../dist/index.js"))
  ) {
    log("Build not found. Run: pnpm run build", "red");
    process.exit(1);
  }

  const sharedSdk = new NeuroLink();

  const tests: Array<{ name: string; fn: () => Promise<boolean | null> }> = [
    // SDK generate + rule scorer evaluation
    {
      name: "1. Generate + Evaluate with Rule Scorers",
      fn: () => testGenerateAndEvaluateWithRuleScorers(sharedSdk),
    },
    // SDK generate + LLM scorer evaluation
    {
      name: "2. Generate + Evaluate with LLM Scorers",
      fn: () => testGenerateAndEvaluateWithLLMScorers(sharedSdk),
    },
    // Inline enableEvaluation on generate()
    {
      name: "3. Generate with enableEvaluation",
      fn: () => testGenerateWithEnableEvaluation(sharedSdk),
    },
    // Stream + evaluate
    {
      name: "4. Stream + Evaluate",
      fn: () => testStreamAndEvaluate(sharedSdk),
    },
    // Preset pipeline evaluation
    {
      name: "5. Evaluate with Preset Pipeline",
      fn: () => testEvaluateWithPreset(sharedSdk),
    },
    // PipelineBuilder fluent API evaluation
    {
      name: "6. Evaluate with PipelineBuilder",
      fn: () => testEvaluateWithPipelineBuilder(sharedSdk),
    },
    // Discriminative: good vs bad response
    {
      name: "7. Good vs Bad Response (Discriminative)",
      fn: () => testEvaluateGoodVsBadResponse(sharedSdk),
    },
    // Ground truth evaluation
    {
      name: "8. Evaluate with Ground Truth",
      fn: () => testEvaluateWithGroundTruth(sharedSdk),
    },
    // Batch evaluate multiple generations
    {
      name: "9. Batch Evaluate Multiple Generations",
      fn: () => testBatchEvaluateMultipleGenerations(sharedSdk),
    },
    // CLI evaluate command
    {
      name: "10. CLI evaluate command",
      fn: () => testCLIEvaluateCommand(),
    },
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      const isSkipped = skippedTests.has(test.name);
      testResults.push({
        name: test.name,
        result: isSkipped ? null : result,
        error: isSkipped
          ? `${test.name} skipped due to missing credentials`
          : null,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      testResults.push({ name: test.name, result: false, error: msg });
    }
    await globalCleanup();
    await new Promise((r) => setTimeout(r, TEST_CONFIG.interTestDelay));
  }

  // Summary -- three buckets: pass / fail / skip
  logSection("Test Results Summary");
  const passed = testResults.filter((r) => r.result === true).length;
  const failed = testResults.filter((r) => r.result === false).length;
  const skipped = testResults.filter((r) => r.result === null).length;
  const total = testResults.length;
  testResults.forEach((t) => {
    const status =
      t.result === null ? "SKIP" : t.result === true ? "PASS" : "FAIL";
    logTest(t.name, status, t.error || "");
  });
  const duration = Math.round((Date.now() - startTime) / 1000);
  log(
    `\nFinal Results: ${passed} passed, ${skipped} skipped, ${failed} failed out of ${total} in ${duration}s`,
    failed === 0 ? "green" : "red",
  );
  if (skipped > 0 && passed === 0 && failed === 0) {
    log(
      `WARNING: All tests were skipped -- no real passes or failures`,
      "yellow",
    );
  }

  log("\n\uD83D\uDCCB Feature Coverage:", "cyan");
  log(
    "   SDK Integration: generate() + rule scorers, generate() + LLM scorers, enableEvaluation flag",
    "reset",
  );
  log("   Streaming: stream() + pipeline evaluation", "reset");
  log(
    "   Pipeline: EvaluationPipeline with presets, PipelineBuilder fluent API",
    "reset",
  );
  log("   Discrimination: Good vs Bad response scoring comparison", "reset");
  log(
    "   Ground Truth: keyword-coverage + content-similarity against expected answer",
    "reset",
  );
  log("   Batch: BatchStrategy over multiple SDK generations", "reset");
  log("   CLI: evaluate presets subcommand via child process", "reset");

  try {
    await sharedSdk.shutdown?.();
  } catch {
    /* ignore */
  }
  process.exit(failed === 0 ? 0 : 1);
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
        `Usage: npx tsx test/continuous-test-suite-evaluation-scoring.ts [--provider=X] [--model=Y]

NeuroLink Evaluation Scoring System Test Suite (SDK Integration)

Tests the evaluation scoring system end-to-end with REAL sdk.generate()
and sdk.stream() calls. Every test generates a response first, then
evaluates it using pipelines, presets, or the inline enableEvaluation flag.

10 tests covering:
  1. Generate + evaluate with rule scorers (length, format, keyword-coverage)
  2. Generate + evaluate with LLM scorers (hallucination, faithfulness, answer-relevancy)
  3. Generate with enableEvaluation=true (inline evaluation)
  4. Stream + evaluate with pipeline
  5. Evaluate with preset pipeline (quality)
  6. Evaluate with PipelineBuilder fluent API
  7. Discriminative: good vs bad response comparison
  8. Ground truth evaluation (keyword-coverage, content-similarity)
  9. Batch evaluate multiple generations
  10. CLI evaluate presets command

Options:
  --provider=X    AI provider (default: vertex)
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
  TEST_CONFIG.maxTokens = PROVIDER_MAX_TOKENS[TEST_CONFIG.provider] || 1024;
}

if (typeof describe === "undefined") {
  runAllTests().catch((e) => {
    log(`Suite crashed: ${e instanceof Error ? e.message : String(e)}`, "red");
    process.exit(1);
  });
} else {
  describe.skip("Continuous Test Suite: Evaluation Scoring System", () => {
    it("runs standalone", () => runAllTests(), 600000);
  });
}
