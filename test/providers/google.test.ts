import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import GoogleAIProvider from "../../src/lib/providers/googleAiStudio.js";
import { streamText } from "ai";
import { TimeoutError } from "../../src/lib/utils/timeout.js";
import { AIProviderName } from "../../src/lib/types/index.js";

// Mock the external dependencies
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    streamText: vi.fn(),
    tool: vi.fn(),
  };
});

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn().mockReturnValue(() => ({
    modelId: "gemini-1.5-flash-latest",
    provider: "google-ai",
  })),
}));

describe("GoogleAIProvider", () => {
  let provider: GoogleAIProvider;

  beforeEach(() => {
    process.env.GOOGLE_AI_API_KEY = "test-key";
    provider = new GoogleAIProvider();
    vi.clearAllMocks();
  });

  it("should create provider with default model", () => {
    expect(provider.getProviderName()).toBe("google-ai");
    expect(provider.getDefaultModel()).toBe("gemini-2.5-flash");
  });

  it("should create provider with custom model", () => {
    const provider = new GoogleAIProvider("gemini-pro");
    expect(provider.getProviderName()).toBe("google-ai");
    expect(provider.getDefaultModel()).toBe("gemini-2.5-flash");
  });

  it("should return correct provider name", () => {
    const provider = new GoogleAIProvider();
    expect(provider.getProviderName()).toBe(AIProviderName.GOOGLE_AI);
  });

  it("should support tools", () => {
    const provider = new GoogleAIProvider();
    expect(provider.supportsTools()).toBe(true);
  });

  it("should handle API key errors", () => {
    const error = { message: "API_KEY_INVALID" };
    expect(() => provider.handleProviderError(error)).toThrow(
      "Invalid Google AI API key",
    );
  });

  it("should handle rate limit errors", () => {
    const error = { message: "RATE_LIMIT_EXCEEDED" };
    expect(() => provider.handleProviderError(error)).toThrow(
      "Google AI rate limit exceeded",
    );
  });

  it("should handle model not found errors", () => {
    const provider = new GoogleAIProvider("invalid-model");
    const error = { message: "model not found" };
    expect(() => provider.handleProviderError(error)).toThrow(
      "Google AI error: model not found",
    );
  });

  it("should handle timeout errors", () => {
    const timeoutError = new TimeoutError("Request timed out", 5000);
    expect(() => provider.handleProviderError(timeoutError)).toThrow(
      "Request timed out",
    );
  });

  it("should handle unknown errors", () => {
    const provider = new GoogleAIProvider();
    const error = { message: "Some unknown error" };
    expect(() => provider.handleProviderError(error)).toThrow(
      "Google AI error: Some unknown error",
    );
  });

  it("should handle errors without message", () => {
    const provider = new GoogleAIProvider();
    const error = {};
    expect(() => provider.handleProviderError(error)).toThrow(
      "Google AI error: Unknown error",
    );
  });

  it("should return AI SDK model instance", () => {
    const model = provider.getAISDKModel();
    expect(model).toBeDefined();
    expect(model.provider).toBe("google-ai");
  });

  describe("executeStream", () => {
    it("should call streamText with the correct parameters", async () => {
      const mockStream = new ReadableStream();
      (streamText as Mock).mockResolvedValue({
        stream: mockStream,
        text: Promise.resolve(""),
        toolCalls: Promise.resolve([]),
        toolResults: Promise.resolve([]),
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        rawResponse: {},
        experimental_streamData: true,
      });

      await provider.stream({ input: { text: "Hello" } });

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(Object),
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "user", content: "Hello" }),
          ]),
        }),
      );
    });

    it("should not make a real API call", async () => {
      const mockStream = new ReadableStream();
      (streamText as Mock).mockResolvedValue({
        stream: mockStream,
        text: Promise.resolve(""),
        toolCalls: Promise.resolve([]),
        toolResults: Promise.resolve([]),
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        rawResponse: {},
        experimental_streamData: true,
      });

      await provider.stream({ input: { text: "Hello" } });

      // Verify that the mock was called
      expect(streamText).toHaveBeenCalled();
    });
  });
});
