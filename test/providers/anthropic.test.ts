import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { AnthropicProvider } from "../../src/lib/providers/anthropic.js";
import { streamText } from "ai";
import { TimeoutError } from "../../src/lib/utils/timeout.js";
import { AIProviderName } from "$lib/types/providers.js";

// Mock the external dependencies
vi.mock("ai", () => ({
  streamText: vi.fn(),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn().mockReturnValue({
    modelId: "claude-3-opus-20240229",
    provider: "anthropic",
  }),
}));

vi.mock("../../src/lib/utils/providerConfig.js", () => ({
  validateApiKey: vi.fn().mockReturnValue("test-api-key"),
  createAnthropicConfig: vi.fn().mockReturnValue({ apiKey: "test-api-key" }),
  getProviderModel: vi.fn().mockReturnValue("claude-3-opus-20240229"),
}));

describe("AnthropicProvider", () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
    vi.clearAllMocks();
  });

  it("should create provider with default model", () => {
    expect(provider.getProviderName()).toBe("anthropic");
    expect(provider.getDefaultModel()).toBe("claude-3-opus-20240229");
  });

  it("should create provider with custom model", () => {
    const provider = new AnthropicProvider("claude-2.1");
    expect(provider.getProviderName()).toBe("anthropic");
    expect(provider.getDefaultModel()).toBe("claude-3-opus-20240229");
  });

  it("should return correct provider name", () => {
    const provider = new AnthropicProvider();
    expect(provider.getProviderName()).toBe(AIProviderName.ANTHROPIC);
  });

  it("should support tools", () => {
    const provider = new AnthropicProvider();
    expect(provider.supportsTools()).toBe(true);
  });

  it("should handle API key errors", () => {
    const error = { message: "Invalid API key" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("Invalid Anthropic API key");
  });

  it("should handle rate limit errors", () => {
    const provider = new AnthropicProvider();
    const error = { message: "rate limit" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("Anthropic rate limit exceeded");
  });

  it("should handle model not found errors", () => {
    const provider = new AnthropicProvider("invalid-model");
    const error = { message: "model not found" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("Anthropic error: model not found");
  });

  it("should handle timeout errors", () => {
    const timeoutError = new TimeoutError("Request timed out", 5000);
    const handledError = provider.handleProviderError(timeoutError);
    expect(handledError.message).toContain(
      "Anthropic request timed out after 5000ms",
    );
  });

  it("should handle unknown errors", () => {
    const error = { message: "Some unknown error" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain(
      "Anthropic error: Some unknown error",
    );
  });

  it("should handle errors without message", () => {
    const error = {};
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("Anthropic error: Unknown error");
  });

  it("should return AI SDK model instance", () => {
    const model = provider.getAISDKModel();
    expect(model).toBeDefined();
    expect(model.provider).toBe("anthropic");
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
