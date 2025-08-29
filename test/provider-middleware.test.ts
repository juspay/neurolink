import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { BaseProvider } from "../src/lib/core/baseProvider.js";
import { AIProviderName } from "../src/lib/core/types.js";
import type {
  EnhancedGenerateResult,
  TextGenerationOptions,
} from "../src/lib/core/types.js";
import type { LanguageModelV1, LanguageModelV1Middleware } from "ai";
import type {
  MiddlewareFactoryOptions,
  NeuroLinkMiddleware,
} from "../src/lib/types/middlewareTypes.js";
import type {
  StreamResult,
  StreamOptions,
} from "../src/lib/types/streamTypes.js";

// Mock the 'ai' package
vi.mock("ai", async () => {
  const actual = await vi.importActual("ai");
  return {
    ...actual,
    wrapLanguageModel: vi.fn(({ model, middleware }) => ({
      ...model,
      isWrapped: true,
      appliedMiddleware: middleware,
    })),
    generateText: vi.fn().mockResolvedValue({
      text: "mocked response",
      toolCalls: [],
      toolResults: [],
      finishReason: "stop",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    }),
  };
});

// Define a mock provider for testing
class MockProvider extends BaseProvider {
  protected getProviderName(): AIProviderName {
    return AIProviderName.OPENAI;
  }

  protected getDefaultModel(): string {
    return "mock-model";
  }

  protected async getAISDKModel(): Promise<LanguageModelV1> {
    return {
      provider: AIProviderName.OPENAI,
      modelId: "mock-model",
      doGenerate: vi.fn(),
      doStream: vi.fn(),
      specificationVersion: "v1",
      defaultObjectGenerationMode: "json",
    };
  }

  protected handleProviderError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }

  protected executeStream(options: StreamOptions): Promise<StreamResult> {
    throw new Error("Method not implemented.");
  }
}

describe("BaseProvider Middleware Integration", () => {
  let wrapLanguageModel: Mock;

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Dynamically import the mocked function to get the latest mock instance
    const ai = await import("ai");
    wrapLanguageModel = ai.wrapLanguageModel as Mock;
  });

  it("should apply middleware when configured in generate options", async () => {
    const provider = new MockProvider("mock-model", AIProviderName.OPENAI);

    // Call generate with middleware options
    await provider.generate({
      prompt: "test prompt",
      middleware: {
        preset: "all",
      },
    });

    // Verify that wrapLanguageModel was called
    expect(wrapLanguageModel).toHaveBeenCalled();

    // Check the applied middleware
    const wrappedModel = wrapLanguageModel.mock.results[0].value;
    const appliedIds = wrappedModel.appliedMiddleware.map(
      (m: LanguageModelV1Middleware) => (m as NeuroLinkMiddleware).metadata.id,
    );

    expect(wrappedModel.isWrapped).toBe(true);
    expect(appliedIds).toContain("analytics");
    expect(appliedIds).toContain("guardrails");
  });

  it("should not apply middleware if no options are provided", async () => {
    const provider = new MockProvider("mock-model", AIProviderName.OPENAI);

    // Call generate without middleware options
    await provider.generate("test prompt");

    // Verify that wrapLanguageModel was NOT called
    expect(wrapLanguageModel).not.toHaveBeenCalled();
  });

  it("should apply custom middleware provided in generate options", async () => {
    const customMiddleware: NeuroLinkMiddleware = {
      metadata: { id: "custom-test", name: "Custom Test" },
      wrapGenerate: async (args) => args.doGenerate(),
    };

    const middlewareOptions: MiddlewareFactoryOptions = {
      middleware: [customMiddleware],
      enabledMiddleware: ["custom-test"],
    };

    const provider = new MockProvider("mock-model", AIProviderName.OPENAI);

    await provider.generate({
      prompt: "test prompt",
      middleware: middlewareOptions,
    });

    expect(wrapLanguageModel).toHaveBeenCalled();
    const wrappedModel = wrapLanguageModel.mock.results[0].value;
    const appliedIds = wrappedModel.appliedMiddleware.map(
      (m: LanguageModelV1Middleware) => (m as NeuroLinkMiddleware).metadata.id,
    );

    expect(wrappedModel.isWrapped).toBe(true);
    expect(appliedIds).toEqual(["custom-test"]);
  });
});
