import { vi, describe, it, expect, beforeEach } from "vitest";
import { createGuardrailsMiddleware } from "../src/lib/middleware/builtin/guardrails.js";
import type { LanguageModelV1 } from "ai";
import { generateText } from "ai";
import { MiddlewareFactory } from "../src/lib/middleware/factory.js";

// Mock the logger to keep test output clean
// At someplaces implicitly added any to avoid type conflicts
vi.mock("../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the generateText function from the 'ai' library
vi.mock("ai", async () => {
  const actual = await vi.importActual("ai");
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

describe("Guardrails Middleware", () => {
  let mockModel: LanguageModelV1;
  let mockFilterModel: LanguageModelV1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let doGenerate: () => Promise<any>;

  beforeEach(() => {
    // Reset mocks before each test
    vi.mocked(generateText).mockClear();

    // Mock for the main model being wrapped
    mockModel = {
      provider: "mock-provider",
      modelId: "mock-model",
      specificationVersion: "v1",
      defaultObjectGenerationMode: "json",
      doGenerate: vi.fn(),
      doStream: vi.fn(),
    };

    // Mock for the model used for filtering content
    mockFilterModel = {
      ...mockModel,
      modelId: "filter-model",
    };

    // Default mock implementation for the original model's doGenerate call
    doGenerate = vi.fn().mockResolvedValue({
      text: "This is a test.",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      finishReason: "stop",
    });
  });

  it("should redact bad words from the output", async () => {
    const guardrailsMiddleware = createGuardrailsMiddleware({
      badWords: { enabled: true, list: ["test", "badword"] },
    });

    // Override doGenerate for this specific test case
    doGenerate = vi.fn().mockResolvedValue({
      text: "This is a test with a badword.",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      finishReason: "stop",
    });

    const wrappedGenerate = await guardrailsMiddleware.wrapGenerate!({
      doGenerate,
      doStream: vi.fn(),
      params: {
        inputFormat: "messages",
        mode: { type: "regular" },
        prompt: [{ role: "user", content: [{ type: "text", text: "test" }] }],
      },
      model: mockModel,
    });

    expect(wrappedGenerate.text).toBe("This is a **** with a *******.");
  });

  it("should invoke the model filter and redact content if unsafe", async () => {
    // Mock the filter model's response to be "unsafe"
    vi.mocked(generateText).mockResolvedValue({
      text: "unsafe",
      usage: { promptTokens: 5, completionTokens: 1, totalTokens: 6 },
      finishReason: "stop",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const guardrailsMiddleware = createGuardrailsMiddleware({
      modelFilter: { enabled: true, filterModel: mockFilterModel },
    });

    const wrappedGenerate = await guardrailsMiddleware.wrapGenerate!({
      doGenerate,
      doStream: vi.fn(),
      params: {
        inputFormat: "messages",
        mode: { type: "regular" },
        prompt: [{ role: "user", content: [{ type: "text", text: "test" }] }],
      },
      model: mockModel,
    });

    expect(wrappedGenerate.text).toBe("<REDACTED BY AI GUARDRAIL>");
    expect(generateText).toHaveBeenCalledWith({
      model: mockFilterModel,
      prompt: `Is the following text safe? Respond with only "safe" or "unsafe".\n\nText: "This is a test."`,
    });
  });

  it("should not redact content if the model filter deems it safe", async () => {
    // Mock the filter model's response to be "safe"
    vi.mocked(generateText).mockResolvedValue({
      text: "safe",
      usage: { promptTokens: 5, completionTokens: 1, totalTokens: 6 },
      finishReason: "stop",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const guardrailsMiddleware = createGuardrailsMiddleware({
      modelFilter: { enabled: true, filterModel: mockFilterModel },
    });

    const wrappedGenerate = await guardrailsMiddleware.wrapGenerate!({
      doGenerate,
      doStream: vi.fn(),
      params: {
        inputFormat: "messages",
        mode: { type: "regular" },
        prompt: [{ role: "user", content: [{ type: "text", text: "test" }] }],
      },
      model: mockModel,
    });

    // The original text should be preserved
    expect(wrappedGenerate.text).toBe("This is a test.");
    expect(generateText).toHaveBeenCalledOnce();
  });

  describe("Guardrails Middleware with MiddlewareFactory", () => {
    let factory: MiddlewareFactory;

    beforeEach(() => {
      factory = new MiddlewareFactory();
    });

    it("should apply bad word filter when enabled through the factory", async () => {
      const context = factory.createContext("mock-provider", "mock-model");
      const wrappedModel = factory.applyMiddleware(mockModel, context, {
        middlewareConfig: {
          guardrails: {
            enabled: true,
            config: {
              badWords: { enabled: true, list: ["test"] },
            },
          },
        },
      });

      // Mock the underlying doGenerate call to return a specific text
      mockModel.doGenerate = vi.fn().mockResolvedValue({
        text: "This is a test.",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        finishReason: "stop",
      });

      const result = await wrappedModel.doGenerate({
        inputFormat: "messages",
        mode: { type: "regular" },
        prompt: [
          {
            role: "user",
            content: [{ type: "text", text: "This is a test." }],
          },
        ],
      });

      expect(result.text).toBe("This is a ****.");
    });

    it("should apply model filter when enabled through the factory", async () => {
      // Mock the filter model's response to be "unsafe"
      vi.mocked(generateText).mockResolvedValue({
        text: "unsafe",
        usage: { promptTokens: 5, completionTokens: 1, totalTokens: 6 },
        finishReason: "stop",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const context = factory.createContext("mock-provider", "mock-model");
      const wrappedModel = factory.applyMiddleware(mockModel, context, {
        middlewareConfig: {
          guardrails: {
            enabled: true,
            config: {
              modelFilter: {
                enabled: true,
                filterModel: mockFilterModel.modelId,
              },
            },
          },
        },
      });

      // Mock the underlying doGenerate call
      mockModel.doGenerate = vi.fn().mockResolvedValue({
        text: "This is some unsafe content.",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        finishReason: "stop",
      });

      const result = await wrappedModel.doGenerate({
        inputFormat: "messages",
        mode: { type: "regular" },
        prompt: [
          {
            role: "user",
            content: [{ type: "text", text: "Generate something." }],
          },
        ],
      });

      expect(result.text).toBe("<REDACTED BY AI GUARDRAIL>");
    });

    it("should not apply guardrails when disabled through the factory", async () => {
      const context = factory.createContext("mock-provider", "mock-model");
      const wrappedModel = factory.applyMiddleware(mockModel, context, {
        middlewareConfig: {
          guardrails: { enabled: false },
        },
      });

      // Since the middleware is disabled, the original model should be returned.
      expect(wrappedModel).toBe(mockModel);
    });
  });
});
