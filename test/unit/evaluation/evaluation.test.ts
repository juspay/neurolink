import { describe, expect, it, vi, beforeEach } from "vitest";
import { mapToEvaluationData } from "../../../src/lib/evaluation/scoring.js";
import { ContextBuilder } from "../../../src/lib/evaluation/contextBuilder.js";
import { RetryManager } from "../../../src/lib/evaluation/retryManager.js";
import { PromptBuilder } from "../../../src/lib/evaluation/prompts.js";
import type {
  EnhancedEvaluationContext,
  EvaluationResult,
} from "../../../src/lib/types/evaluationTypes.js";
import type { GenerateResult } from "../../../src/lib/types/generateTypes.js";
import type { LanguageModelV1CallOptions } from "ai";

// ---------------------------------------------------------------------------
// Mock AIProviderFactory so RAGASEvaluator never makes real API calls
// ---------------------------------------------------------------------------
vi.mock("../../../src/lib/core/factory.js", () => ({
  AIProviderFactory: {
    createProvider: vi.fn(),
  },
}));

// Suppress logger output during tests
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvalContext(
  overrides: Partial<EnhancedEvaluationContext> = {},
): EnhancedEvaluationContext {
  return {
    userQuery: "What is NeuroLink?",
    queryAnalysis: {
      type: "question",
      complexity: "low",
      shouldHaveUsedTools: false,
    },
    aiResponse: "NeuroLink is an enterprise AI platform.",
    provider: "openai",
    model: "gpt-4o",
    generationParams: { temperature: 0.7 },
    toolExecutions: [],
    conversationHistory: [
      {
        role: "user",
        content: "What is NeuroLink?",
        timestamp: new Date().toISOString(),
      },
    ],
    responseTime: 500,
    tokenUsage: { input: 10, output: 20, total: 30 },
    previousEvaluations: [],
    attemptNumber: 1,
    ...overrides,
  };
}

function makeEvalResult(
  overrides: Partial<EvaluationResult> = {},
): EvaluationResult {
  return {
    finalScore: 8,
    relevanceScore: 9,
    accuracyScore: 8,
    completenessScore: 7,
    isPassing: true,
    reasoning: "Good response.",
    suggestedImprovements: "Add more detail.",
    rawEvaluationResponse: '{"finalScore":8}',
    evaluationModel: "gemini-1.5-flash",
    evaluationTime: 200,
    attemptNumber: 1,
    ...overrides,
  };
}

function makeLLMCallOptions(
  overrides: Partial<LanguageModelV1CallOptions> = {},
): LanguageModelV1CallOptions {
  return {
    prompt: [
      { role: "system", content: "You are helpful." },
      { role: "user", content: [{ type: "text", text: "What is NeuroLink?" }] },
    ],
    mode: { type: "regular" },
    ...overrides,
  } as LanguageModelV1CallOptions;
}

function makeGenerateResult(
  overrides: Partial<GenerateResult> = {},
): GenerateResult {
  return {
    content: "NeuroLink is an enterprise AI platform.",
    provider: "openai",
    model: "gpt-4o",
    responseTime: 450,
    usage: { input: 10, output: 20, total: 30 },
    ...overrides,
  } as GenerateResult;
}

// ===========================================================================
// 1. mapToEvaluationData (scoring.ts)
// ===========================================================================
describe("mapToEvaluationData (scoring)", () => {
  const ctx = makeEvalContext();

  it("maps all score fields from EvaluationResult to EvaluationData", () => {
    const result = makeEvalResult({
      relevanceScore: 9,
      accuracyScore: 8,
      completenessScore: 7,
      finalScore: 8,
    });
    const data = mapToEvaluationData(ctx, result, 7);

    expect(data.relevance).toBe(9);
    expect(data.accuracy).toBe(8);
    expect(data.completeness).toBe(7);
    expect(data.overall).toBe(8);
  });

  it("sets isPassing=true when finalScore >= threshold", () => {
    const result = makeEvalResult({ finalScore: 7 });
    const data = mapToEvaluationData(ctx, result, 7);
    expect(data.alertSeverity).toBe("none");
  });

  it("sets alertSeverity=medium when below threshold but >= highSeverityThreshold", () => {
    const result = makeEvalResult({ finalScore: 5 });
    const data = mapToEvaluationData(ctx, result, 7, 3, 4);
    expect(data.alertSeverity).toBe("medium");
  });

  it("sets alertSeverity=high when below highSeverityThreshold", () => {
    const result = makeEvalResult({ finalScore: 3 });
    const data = mapToEvaluationData(ctx, result, 7, 5, 4);
    expect(data.alertSeverity).toBe("high");
  });

  it("sets isOffTopic=true when finalScore < offTopicThreshold", () => {
    const result = makeEvalResult({ finalScore: 3 });
    const data = mapToEvaluationData(ctx, result, 7, 5);
    expect(data.isOffTopic).toBe(true);
  });

  it("sets isOffTopic=false when finalScore >= offTopicThreshold", () => {
    const result = makeEvalResult({ finalScore: 6 });
    const data = mapToEvaluationData(ctx, result, 7, 5);
    expect(data.isOffTopic).toBe(false);
  });

  it("uses default offTopicThreshold=5 and highSeverityThreshold=4", () => {
    const result = makeEvalResult({ finalScore: 4 });
    const data = mapToEvaluationData(ctx, result, 7);
    // finalScore 4 < default offTopicThreshold 5
    expect(data.isOffTopic).toBe(true);
    // finalScore 4 >= default highSeverityThreshold 4, so medium
    expect(data.alertSeverity).toBe("medium");
  });

  it("includes reasoning, suggestedImprovements, evaluationModel, evaluationTime, evaluationAttempt", () => {
    const result = makeEvalResult({
      reasoning: "Clear answer.",
      suggestedImprovements: "Could add examples.",
      evaluationModel: "gpt-4o",
      evaluationTime: 123,
      attemptNumber: 2,
    });
    const data = mapToEvaluationData(ctx, result, 7);
    expect(data.reasoning).toBe("Clear answer.");
    expect(data.suggestedImprovements).toBe("Could add examples.");
    expect(data.evaluationModel).toBe("gpt-4o");
    expect(data.evaluationTime).toBe(123);
    expect(data.evaluationAttempt).toBe(2);
  });

  it("carries responseContent and queryContent from evalContext", () => {
    const customCtx = makeEvalContext({
      aiResponse: "Custom AI response",
      userQuery: "Custom query",
    });
    const result = makeEvalResult();
    const data = mapToEvaluationData(customCtx, result, 7);
    expect(data.responseContent).toBe("Custom AI response");
    expect(data.queryContent).toBe("Custom query");
  });

  it("handles zero scores gracefully", () => {
    const result = makeEvalResult({
      finalScore: 0,
      relevanceScore: 0,
      accuracyScore: 0,
      completenessScore: 0,
    });
    const data = mapToEvaluationData(ctx, result, 7);
    expect(data.relevance).toBe(0);
    expect(data.accuracy).toBe(0);
    expect(data.completeness).toBe(0);
    expect(data.overall).toBe(0);
    expect(data.isOffTopic).toBe(true);
    expect(data.alertSeverity).toBe("high");
  });

  it("handles perfect scores", () => {
    const result = makeEvalResult({
      finalScore: 10,
      relevanceScore: 10,
      accuracyScore: 10,
      completenessScore: 10,
    });
    const data = mapToEvaluationData(ctx, result, 7);
    expect(data.relevance).toBe(10);
    expect(data.overall).toBe(10);
    expect(data.isOffTopic).toBe(false);
    expect(data.alertSeverity).toBe("none");
  });
});

// ===========================================================================
// 2. ContextBuilder (contextBuilder.ts)
// ===========================================================================
describe("ContextBuilder", () => {
  let builder: ContextBuilder;

  beforeEach(() => {
    builder = new ContextBuilder();
  });

  it("extracts userQuery from the last user message", () => {
    const options = makeLLMCallOptions({
      prompt: [
        { role: "user", content: [{ type: "text", text: "First question" }] },
        { role: "assistant", content: [{ type: "text", text: "Response" }] },
        { role: "user", content: [{ type: "text", text: "Second question" }] },
      ],
    });
    const result = makeGenerateResult();
    const ctx = builder.buildContext(options, result);
    expect(ctx.userQuery).toBe("Second question");
  });

  it("extracts userQuery from string content", () => {
    const options = makeLLMCallOptions({
      prompt: [{ role: "user", content: "Plain text question" }],
    });
    const result = makeGenerateResult();
    const ctx = builder.buildContext(options, result);
    expect(ctx.userQuery).toBe("Plain text question");
  });

  it("extracts system prompt", () => {
    const options = makeLLMCallOptions({
      prompt: [
        { role: "system", content: "System instructions" },
        { role: "user", content: "Hello" },
      ],
    });
    const result = makeGenerateResult();
    const ctx = builder.buildContext(options, result);
    expect(ctx.generationParams.systemPrompt).toBe("System instructions");
  });

  it("handles empty prompt array", () => {
    const options = makeLLMCallOptions({ prompt: [] });
    const result = makeGenerateResult();
    const ctx = builder.buildContext(options, result);
    expect(ctx.userQuery).toBe("");
    expect(ctx.conversationHistory).toEqual([]);
  });

  it("populates aiResponse from result.content", () => {
    const result = makeGenerateResult({ content: "AI says hello" });
    const ctx = builder.buildContext(makeLLMCallOptions(), result);
    expect(ctx.aiResponse).toBe("AI says hello");
  });

  it("populates provider and model", () => {
    const result = makeGenerateResult({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
    });
    const ctx = builder.buildContext(makeLLMCallOptions(), result);
    expect(ctx.provider).toBe("anthropic");
    expect(ctx.model).toBe("claude-sonnet-4-20250514");
  });

  it("falls back to 'unknown' for missing provider/model", () => {
    const result = makeGenerateResult({
      provider: undefined,
      model: undefined,
    }) as GenerateResult;
    const ctx = builder.buildContext(makeLLMCallOptions(), result);
    expect(ctx.provider).toBe("unknown");
    expect(ctx.model).toBe("unknown");
  });

  it("populates tokenUsage from result.usage", () => {
    const result = makeGenerateResult({
      usage: { input: 100, output: 200, total: 300 },
    });
    const ctx = builder.buildContext(makeLLMCallOptions(), result);
    expect(ctx.tokenUsage).toEqual({ input: 100, output: 200, total: 300 });
  });

  it("defaults tokenUsage to zeros when usage missing", () => {
    const result = makeGenerateResult({ usage: undefined }) as GenerateResult;
    const ctx = builder.buildContext(makeLLMCallOptions(), result);
    expect(ctx.tokenUsage).toEqual({ input: 0, output: 0, total: 0 });
  });

  it("maps tool executions from result.toolExecutions", () => {
    const result = makeGenerateResult({
      toolExecutions: [
        { name: "calculator", input: { expr: "2+2" }, output: "4" },
      ],
    } as Partial<GenerateResult>);
    const ctx = builder.buildContext(makeLLMCallOptions(), result);
    expect(ctx.toolExecutions).toHaveLength(1);
    expect(ctx.toolExecutions[0].toolName).toBe("calculator");
    expect(ctx.toolExecutions[0].result.data).toBe("4");
    expect(ctx.toolExecutions[0].result.success).toBe(true);
  });

  it("returns empty toolExecutions when none present", () => {
    const result = makeGenerateResult();
    const ctx = builder.buildContext(makeLLMCallOptions(), result);
    expect(ctx.toolExecutions).toEqual([]);
  });

  it("excludes system messages from conversationHistory", () => {
    const options = makeLLMCallOptions({
      prompt: [
        { role: "system", content: "System" },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
      ],
    });
    const ctx = builder.buildContext(options, makeGenerateResult());
    expect(ctx.conversationHistory).toHaveLength(2);
    expect(ctx.conversationHistory[0].role).toBe("user");
    expect(ctx.conversationHistory[1].role).toBe("assistant");
  });

  describe("query intent analysis", () => {
    it("detects question type for queries starting with 'what'", () => {
      const options = makeLLMCallOptions({
        prompt: [{ role: "user", content: "What is AI?" }],
      });
      const ctx = builder.buildContext(options, makeGenerateResult());
      expect(ctx.queryAnalysis.type).toBe("question");
    });

    it("detects question type for queries starting with 'how'", () => {
      const options = makeLLMCallOptions({
        prompt: [{ role: "user", content: "How does it work?" }],
      });
      const ctx = builder.buildContext(options, makeGenerateResult());
      expect(ctx.queryAnalysis.type).toBe("question");
    });

    it("detects question type for queries starting with 'why'", () => {
      const options = makeLLMCallOptions({
        prompt: [{ role: "user", content: "Why is the sky blue?" }],
      });
      const ctx = builder.buildContext(options, makeGenerateResult());
      expect(ctx.queryAnalysis.type).toBe("question");
    });

    it("detects greeting type for short queries", () => {
      const options = makeLLMCallOptions({
        prompt: [{ role: "user", content: "Hello there" }],
      });
      const ctx = builder.buildContext(options, makeGenerateResult());
      expect(ctx.queryAnalysis.type).toBe("greeting");
    });

    it("detects command type for longer non-question queries", () => {
      const options = makeLLMCallOptions({
        prompt: [
          {
            role: "user",
            content:
              "Please generate a comprehensive report about the weather patterns.",
          },
        ],
      });
      const ctx = builder.buildContext(options, makeGenerateResult());
      expect(ctx.queryAnalysis.type).toBe("command");
    });

    it("sets complexity=high for queries > 100 chars", () => {
      const options = makeLLMCallOptions({
        prompt: [{ role: "user", content: "a".repeat(101) }],
      });
      const ctx = builder.buildContext(options, makeGenerateResult());
      expect(ctx.queryAnalysis.complexity).toBe("high");
    });

    it("sets complexity=medium for queries 41-100 chars", () => {
      const options = makeLLMCallOptions({
        prompt: [{ role: "user", content: "a".repeat(50) }],
      });
      const ctx = builder.buildContext(options, makeGenerateResult());
      expect(ctx.queryAnalysis.complexity).toBe("medium");
    });

    it("sets complexity=low for queries <= 40 chars", () => {
      const options = makeLLMCallOptions({
        prompt: [{ role: "user", content: "Short query" }],
      });
      const ctx = builder.buildContext(options, makeGenerateResult());
      expect(ctx.queryAnalysis.complexity).toBe("low");
    });
  });

  describe("recordEvaluation and attempt tracking", () => {
    it("starts at attempt 1 and increments after recording", () => {
      const ctx1 = builder.buildContext(
        makeLLMCallOptions(),
        makeGenerateResult(),
      );
      expect(ctx1.attemptNumber).toBe(1);
      expect(ctx1.previousEvaluations).toEqual([]);

      builder.recordEvaluation(makeEvalResult({ attemptNumber: 1 }));
      const ctx2 = builder.buildContext(
        makeLLMCallOptions(),
        makeGenerateResult(),
      );
      expect(ctx2.attemptNumber).toBe(2);
      expect(ctx2.previousEvaluations).toHaveLength(1);
    });

    it("accumulates previous evaluations across multiple recordings", () => {
      builder.recordEvaluation(makeEvalResult({ attemptNumber: 1 }));
      builder.recordEvaluation(
        makeEvalResult({ attemptNumber: 2, finalScore: 5 }),
      );
      const ctx = builder.buildContext(
        makeLLMCallOptions(),
        makeGenerateResult(),
      );
      expect(ctx.attemptNumber).toBe(3);
      expect(ctx.previousEvaluations).toHaveLength(2);
    });

    it("reset clears attempt counter and previous evaluations", () => {
      builder.recordEvaluation(makeEvalResult());
      builder.reset();
      const ctx = builder.buildContext(
        makeLLMCallOptions(),
        makeGenerateResult(),
      );
      expect(ctx.attemptNumber).toBe(1);
      expect(ctx.previousEvaluations).toEqual([]);
    });
  });
});

// ===========================================================================
// 3. RetryManager (retryManager.ts)
// ===========================================================================
describe("RetryManager", () => {
  describe("shouldRetry", () => {
    it("returns true when evaluation fails and attempts remaining (default maxRetries=2)", () => {
      const manager = new RetryManager();
      const eval1 = makeEvalResult({
        isPassing: false,
        attemptNumber: 1,
      });
      expect(manager.shouldRetry(eval1)).toBe(true);
    });

    it("returns true for attempt 2 with default maxRetries=2", () => {
      const manager = new RetryManager();
      const eval2 = makeEvalResult({
        isPassing: false,
        attemptNumber: 2,
      });
      expect(manager.shouldRetry(eval2)).toBe(true);
    });

    it("returns false when attempt exceeds maxRetries", () => {
      const manager = new RetryManager();
      const eval3 = makeEvalResult({
        isPassing: false,
        attemptNumber: 3,
      });
      expect(manager.shouldRetry(eval3)).toBe(false);
    });

    it("returns false when evaluation passes regardless of attempt", () => {
      const manager = new RetryManager();
      const passing = makeEvalResult({
        isPassing: true,
        attemptNumber: 1,
      });
      expect(manager.shouldRetry(passing)).toBe(false);
    });

    it("respects custom maxRetries", () => {
      const manager = new RetryManager(1);
      const eval1 = makeEvalResult({ isPassing: false, attemptNumber: 1 });
      expect(manager.shouldRetry(eval1)).toBe(true);

      const eval2 = makeEvalResult({ isPassing: false, attemptNumber: 2 });
      expect(manager.shouldRetry(eval2)).toBe(false);
    });

    it("maxRetries=0 means no retries allowed", () => {
      const manager = new RetryManager(0);
      const eval1 = makeEvalResult({ isPassing: false, attemptNumber: 1 });
      expect(manager.shouldRetry(eval1)).toBe(false);
    });
  });

  describe("prepareRetryOptions", () => {
    it("incorporates feedback into a new prompt", () => {
      const manager = new RetryManager();
      const originalOptions = {
        prompt: "Tell me about AI",
      };
      const evaluation = makeEvalResult({
        suggestedImprovements: "Add examples",
        attemptNumber: 1,
      });

      const retryOptions = manager.prepareRetryOptions(
        originalOptions as unknown as Parameters<
          typeof manager.prepareRetryOptions
        >[0],
        evaluation,
      );
      expect(retryOptions.prompt).toContain("Tell me about AI");
      expect(retryOptions.prompt).toContain("Add examples");
      expect(retryOptions.input).toBeUndefined();
    });

    it("uses input.text as original prompt when prompt field is missing", () => {
      const manager = new RetryManager();
      const originalOptions = {
        input: { text: "Tell me about AI" },
      };
      const evaluation = makeEvalResult({
        suggestedImprovements: "Be more specific",
        attemptNumber: 1,
      });

      const retryOptions = manager.prepareRetryOptions(
        originalOptions as unknown as Parameters<
          typeof manager.prepareRetryOptions
        >[0],
        evaluation,
      );
      expect(retryOptions.prompt).toContain("Tell me about AI");
    });

    it("preserves original options except prompt and input", () => {
      const manager = new RetryManager();
      const originalOptions = {
        prompt: "Tell me about AI",
        temperature: 0.7,
        maxTokens: 1000,
      };
      const evaluation = makeEvalResult({ attemptNumber: 1 });
      const retryOptions = manager.prepareRetryOptions(
        originalOptions as any,
        evaluation,
      );
      expect((retryOptions as any).temperature).toBe(0.7);
      expect((retryOptions as any).maxTokens).toBe(1000);
    });

    it("stores original prompt in originalPrompt field", () => {
      const manager = new RetryManager();
      const originalOptions = {
        prompt: "Original question",
      };
      const evaluation = makeEvalResult({ attemptNumber: 1 });
      const retryOptions = manager.prepareRetryOptions(
        originalOptions as any,
        evaluation,
      );
      expect(retryOptions.originalPrompt).toBe("Original question");
    });

    it("does not overwrite existing originalPrompt on subsequent retries", () => {
      const manager = new RetryManager();
      const firstRetryOptions = {
        prompt: "Modified prompt from retry 1",
        originalPrompt: "Very first question",
      };
      const evaluation = makeEvalResult({ attemptNumber: 2 });
      const retryOptions = manager.prepareRetryOptions(
        firstRetryOptions as any,
        evaluation,
      );
      expect(retryOptions.originalPrompt).toBe("Very first question");
    });

    it("uses progressively more urgent language for retry attempt 2 (first retry)", () => {
      const manager = new RetryManager();
      const options = { prompt: "Question" };
      const eval1 = makeEvalResult({
        attemptNumber: 1,
        suggestedImprovements: "fix it",
      });
      const retry = manager.prepareRetryOptions(options as any, eval1);
      expect(retry.prompt).toContain("was not satisfactory");
    });

    it("uses MUST language for retry attempt 3 (second retry)", () => {
      const manager = new RetryManager();
      const options = { prompt: "Question" };
      const eval2 = makeEvalResult({
        attemptNumber: 2,
        suggestedImprovements: "fix it",
      });
      const retry = manager.prepareRetryOptions(options as any, eval2);
      expect(retry.prompt).toContain("MUST address");
    });

    it("uses final attempt language for attempts beyond 3", () => {
      const manager = new RetryManager(5);
      const options = { prompt: "Question" };
      const eval4 = makeEvalResult({
        attemptNumber: 4,
        suggestedImprovements: "fix it",
      });
      const retry = manager.prepareRetryOptions(options as any, eval4);
      expect(retry.prompt).toContain("final attempt");
    });
  });
});

// ===========================================================================
// 4. PromptBuilder (prompts.ts)
// ===========================================================================
describe("PromptBuilder", () => {
  let promptBuilder: PromptBuilder;

  beforeEach(() => {
    promptBuilder = new PromptBuilder();
  });

  it("builds a default prompt containing query, response, and output format", () => {
    const ctx = makeEvalContext();
    const prompt = promptBuilder.buildEvaluationPrompt(ctx);
    expect(prompt).toContain("What is NeuroLink?");
    expect(prompt).toContain("NeuroLink is an enterprise AI platform.");
    expect(prompt).toContain("relevanceScore");
    expect(prompt).toContain("accuracyScore");
    expect(prompt).toContain("completenessScore");
    expect(prompt).toContain("finalScore");
    expect(prompt).toContain("Output Format (JSON)");
  });

  it("includes tool execution info when tools were used", () => {
    const ctx = makeEvalContext({
      toolExecutions: [
        {
          toolName: "webSearch",
          params: {},
          result: { success: true, data: "results" },
          executionTime: 100,
          timestamp: Date.now(),
        },
      ],
    });
    const prompt = promptBuilder.buildEvaluationPrompt(ctx);
    expect(prompt).toContain("webSearch");
    expect(prompt).toContain("Tools were used");
  });

  it("indicates no tools when none used", () => {
    const ctx = makeEvalContext({ toolExecutions: [] });
    const prompt = promptBuilder.buildEvaluationPrompt(ctx);
    expect(prompt).toContain("No tools were used");
  });

  it("includes retry context for subsequent attempts", () => {
    const prevEval = makeEvalResult({
      reasoning: "Missing detail",
      suggestedImprovements: "Add examples",
    });
    const ctx = makeEvalContext({
      attemptNumber: 2,
      previousEvaluations: [prevEval],
    });
    const prompt = promptBuilder.buildEvaluationPrompt(ctx);
    expect(prompt).toContain("attempt #2");
    expect(prompt).toContain("Missing detail");
    expect(prompt).toContain("Add examples");
  });

  it("indicates first attempt when no previous evaluations", () => {
    const ctx = makeEvalContext({
      attemptNumber: 1,
      previousEvaluations: [],
    });
    const prompt = promptBuilder.buildEvaluationPrompt(ctx);
    expect(prompt).toContain("first attempt");
  });

  it("uses custom promptGenerator when provided", () => {
    const customGenerator = vi.fn().mockReturnValue("CUSTOM PROMPT BODY");
    const ctx = makeEvalContext();
    const prompt = promptBuilder.buildEvaluationPrompt(ctx, customGenerator);
    expect(customGenerator).toHaveBeenCalledOnce();
    expect(prompt).toContain("CUSTOM PROMPT BODY");
    // Output format should still be appended
    expect(prompt).toContain("Output Format (JSON)");
  });

  it("passes correct context to custom promptGenerator", () => {
    const customGenerator = vi.fn().mockReturnValue("custom");
    const ctx = makeEvalContext({
      userQuery: "Test query",
      aiResponse: "Test response",
    });
    promptBuilder.buildEvaluationPrompt(ctx, customGenerator);
    const passedContext = customGenerator.mock.calls[0][0];
    expect(passedContext.userQuery).toBe("Test query");
    expect(passedContext.aiResponse).toBe("Test response");
    expect(passedContext).toHaveProperty("history");
    expect(passedContext).toHaveProperty("tools");
    expect(passedContext).toHaveProperty("retryInfo");
  });
});

// ===========================================================================
// 5. RAGASEvaluator (ragasEvaluator.ts) - with mocked provider
// ===========================================================================
describe("RAGASEvaluator", () => {
  // We need to import after mocking
  let RAGASEvaluator: typeof import("../../../src/lib/evaluation/ragasEvaluator.js").RAGASEvaluator;
  let AIProviderFactory: {
    createProvider: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const evalModule = await import(
      "../../../src/lib/evaluation/ragasEvaluator.js"
    );
    RAGASEvaluator = evalModule.RAGASEvaluator;
    const factoryModule = await import("../../../src/lib/core/factory.js");
    AIProviderFactory =
      factoryModule.AIProviderFactory as unknown as typeof AIProviderFactory;
  });

  it("returns a valid EvaluationResult when LLM returns well-formed JSON", async () => {
    const mockResponse = JSON.stringify({
      relevanceScore: 8,
      accuracyScore: 7,
      completenessScore: 9,
      finalScore: 8,
      reasoning: "Solid response.",
      suggestedImprovements: "Add code examples.",
    });
    AIProviderFactory.createProvider.mockResolvedValue({
      generate: vi.fn().mockResolvedValue({ content: mockResponse }),
    });

    const evaluator = new RAGASEvaluator("test-model", "test-provider", 7);
    const ctx = makeEvalContext();
    const result = await evaluator.evaluate(ctx);

    expect(result.relevanceScore).toBe(8);
    expect(result.accuracyScore).toBe(7);
    expect(result.completenessScore).toBe(9);
    expect(result.finalScore).toBe(8);
    expect(result.isPassing).toBe(true);
    expect(result.reasoning).toBe("Solid response.");
    expect(result.suggestedImprovements).toBe("Add code examples.");
    expect(result.evaluationModel).toBe("test-model");
    expect(result.attemptNumber).toBe(1);
    expect(result.evaluationTime).toBeGreaterThanOrEqual(0);
  });

  it("handles JSON wrapped in markdown code fences", async () => {
    const mockResponse =
      '```json\n{"relevanceScore":9,"accuracyScore":8,"completenessScore":7,"finalScore":8,"reasoning":"Good","suggestedImprovements":"None"}\n```';
    AIProviderFactory.createProvider.mockResolvedValue({
      generate: vi.fn().mockResolvedValue({ content: mockResponse }),
    });

    const evaluator = new RAGASEvaluator("model", "provider", 7);
    const result = await evaluator.evaluate(makeEvalContext());
    expect(result.relevanceScore).toBe(9);
    expect(result.finalScore).toBe(8);
  });

  it("returns zero scores when LLM returns malformed JSON", async () => {
    AIProviderFactory.createProvider.mockResolvedValue({
      generate: vi
        .fn()
        .mockResolvedValue({ content: "This is not valid JSON at all" }),
    });

    const evaluator = new RAGASEvaluator("model", "provider", 7);
    const result = await evaluator.evaluate(makeEvalContext());
    expect(result.relevanceScore).toBe(0);
    expect(result.accuracyScore).toBe(0);
    expect(result.completenessScore).toBe(0);
    expect(result.finalScore).toBe(0);
    expect(result.isPassing).toBe(false);
    expect(result.reasoning).toBe("Error parsing evaluation response.");
  });

  it("throws when provider.generate returns null/undefined", async () => {
    AIProviderFactory.createProvider.mockResolvedValue({
      generate: vi.fn().mockResolvedValue(null),
    });

    const evaluator = new RAGASEvaluator("model", "provider", 7);
    await expect(evaluator.evaluate(makeEvalContext())).rejects.toThrow(
      "Evaluation generation failed to return a result",
    );
  });

  it("sets isPassing=false when finalScore is below threshold", async () => {
    const mockResponse = JSON.stringify({
      relevanceScore: 3,
      accuracyScore: 3,
      completenessScore: 3,
      finalScore: 3,
      reasoning: "Poor",
      suggestedImprovements: "Redo",
    });
    AIProviderFactory.createProvider.mockResolvedValue({
      generate: vi.fn().mockResolvedValue({ content: mockResponse }),
    });

    const evaluator = new RAGASEvaluator("model", "provider", 7);
    const result = await evaluator.evaluate(makeEvalContext());
    expect(result.isPassing).toBe(false);
    expect(result.finalScore).toBe(3);
  });

  it("passes the correct provider and model to AIProviderFactory", async () => {
    AIProviderFactory.createProvider.mockResolvedValue({
      generate: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          relevanceScore: 5,
          accuracyScore: 5,
          completenessScore: 5,
          finalScore: 5,
          reasoning: "ok",
          suggestedImprovements: "ok",
        }),
      }),
    });

    const evaluator = new RAGASEvaluator("my-model", "my-provider", 7);
    await evaluator.evaluate(makeEvalContext());
    expect(AIProviderFactory.createProvider).toHaveBeenCalledWith(
      "my-provider",
      "my-model",
    );
  });

  it("handles missing fields in LLM response JSON gracefully", async () => {
    const mockResponse = JSON.stringify({
      finalScore: 6,
    });
    AIProviderFactory.createProvider.mockResolvedValue({
      generate: vi.fn().mockResolvedValue({ content: mockResponse }),
    });

    const evaluator = new RAGASEvaluator("model", "provider", 7);
    const result = await evaluator.evaluate(makeEvalContext());
    expect(result.relevanceScore).toBe(0);
    expect(result.accuracyScore).toBe(0);
    expect(result.completenessScore).toBe(0);
    expect(result.finalScore).toBe(6);
    expect(result.suggestedImprovements).toBe("No suggestions provided.");
    expect(result.reasoning).toBe("No reasoning provided.");
  });

  it("includes rawEvaluationResponse in the result", async () => {
    const rawContent = JSON.stringify({
      relevanceScore: 7,
      accuracyScore: 7,
      completenessScore: 7,
      finalScore: 7,
      reasoning: "OK",
      suggestedImprovements: "None",
    });
    AIProviderFactory.createProvider.mockResolvedValue({
      generate: vi.fn().mockResolvedValue({ content: rawContent }),
    });

    const evaluator = new RAGASEvaluator("model", "provider", 7);
    const result = await evaluator.evaluate(makeEvalContext());
    expect(result.rawEvaluationResponse).toBe(rawContent);
  });
});

// ===========================================================================
// 6. Evaluator (index.ts) - integration of all components
// ===========================================================================
describe("Evaluator", () => {
  let Evaluator: typeof import("../../../src/lib/evaluation/index.js").Evaluator;
  let AIProviderFactory: {
    createProvider: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const evalModule = await import("../../../src/lib/evaluation/index.js");
    Evaluator = evalModule.Evaluator;
    const factoryModule = await import("../../../src/lib/core/factory.js");
    AIProviderFactory =
      factoryModule.AIProviderFactory as unknown as typeof AIProviderFactory;
  });

  function setupMockProvider(response: object) {
    AIProviderFactory.createProvider.mockResolvedValue({
      generate: vi.fn().mockResolvedValue({
        content: JSON.stringify(response),
      }),
    });
  }

  it("evaluates with ragas strategy and returns EvaluationData", async () => {
    setupMockProvider({
      relevanceScore: 8,
      accuracyScore: 7,
      completenessScore: 9,
      finalScore: 8,
      reasoning: "Good",
      suggestedImprovements: "None",
    });

    const evaluator = new Evaluator({
      evaluationStrategy: "ragas",
      evaluationModel: "test-model",
      provider: "test-provider",
      threshold: 7,
    });

    const options = makeLLMCallOptions();
    const result = makeGenerateResult();
    const data = await evaluator.evaluate(options, result, 7, {});
    expect(data.relevance).toBe(8);
    expect(data.accuracy).toBe(7);
    expect(data.completeness).toBe(9);
    expect(data.overall).toBe(8);
    expect(data.alertSeverity).toBe("none");
    expect(data.reasoning).toBe("Good");
  });

  it("evaluates with custom strategy when customEvaluator is provided", async () => {
    const customEvaluator = vi.fn().mockResolvedValue({
      evaluationResult: makeEvalResult({
        finalScore: 9,
        relevanceScore: 9,
        accuracyScore: 9,
        completenessScore: 9,
      }),
      evalContext: makeEvalContext(),
    });

    const evaluator = new Evaluator({
      evaluationStrategy: "custom",
      customEvaluator,
    });

    const data = await evaluator.evaluate(
      makeLLMCallOptions(),
      makeGenerateResult(),
      7,
      {},
    );
    expect(data.relevance).toBe(9);
    expect(data.overall).toBe(9);
    expect(customEvaluator).toHaveBeenCalledOnce();
  });

  it("throws when custom strategy is used without a customEvaluator", async () => {
    const evaluator = new Evaluator({
      evaluationStrategy: "custom",
    });

    await expect(
      evaluator.evaluate(makeLLMCallOptions(), makeGenerateResult(), 7, {}),
    ).rejects.toThrow("Custom evaluator function not provided");
  });

  it("throws for unsupported evaluation strategy", async () => {
    const evaluator = new Evaluator({
      evaluationStrategy: "unsupported" as any,
    });

    await expect(
      evaluator.evaluate(makeLLMCallOptions(), makeGenerateResult(), 7, {}),
    ).rejects.toThrow("Unsupported evaluation strategy");
  });

  it("passes offTopicThreshold and highSeverityThreshold from config", async () => {
    setupMockProvider({
      relevanceScore: 2,
      accuracyScore: 2,
      completenessScore: 2,
      finalScore: 2,
      reasoning: "Off topic",
      suggestedImprovements: "Fix",
    });

    const evaluator = new Evaluator({
      evaluationStrategy: "ragas",
      evaluationModel: "test-model",
      provider: "test-provider",
    });

    const data = await evaluator.evaluate(
      makeLLMCallOptions(),
      makeGenerateResult(),
      7,
      { offTopicThreshold: 3, highSeverityThreshold: 3 },
    );
    expect(data.isOffTopic).toBe(true);
    expect(data.alertSeverity).toBe("high");
  });
});
