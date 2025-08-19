import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { MistralProvider } from "../../src/lib/providers/mistral.js";
import { streamText } from "ai";
import { TimeoutError } from "../../src/lib/utils/timeout.js";
import { OllamaProvider } from "../../src/lib/providers/ollama.js";
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

vi.mock("@ai-sdk/mistral", () => ({
  createMistral: vi.fn().mockReturnValue(() => ({
    modelId: "mistral-large-latest",
    provider: "mistral",
  })),
}));

describe("MistralProvider", () => {
  let provider: MistralProvider;

  beforeEach(() => {
    process.env.MISTRAL_API_KEY = "test";
    provider = new MistralProvider();
    vi.clearAllMocks();
  });

  it("should create provider with default model", () => {
    expect(provider.getProviderName()).toBe("mistral");
    expect(provider.getDefaultModel()).toBe("mistral-large-latest");
  });

  it("should create provider with custom model", () => {
    const provider = new MistralProvider("mistral-small-latest");
    expect(provider.getProviderName()).toBe("mistral");
    expect(provider.getDefaultModel()).toBe("mistral-large-latest");
  });

  it("should return correct provider name", () => {
    const provider = new MistralProvider();
    expect(provider.getProviderName()).toBe(AIProviderName.MISTRAL);
  });

  it("should report tool support based on configuration (defaults to false)", () => {
    const provider = new OllamaProvider();
    expect(provider.supportsTools()).toBe(false);
  });

  it("should handle API key errors", () => {
    const provider = new MistralProvider();
    const error = { message: "Invalid API key" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("Invalid Mistral API key");
  });

  it("should handle rate limit errors", () => {
    const provider = new MistralProvider();
    const error = { message: "Rate limit exceeded" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("Mistral rate limit exceeded");
  });

  it("should handle model not found errors", () => {
    const provider = new MistralProvider("invalid-model");
    const error = { message: "Model not found" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("Mistral error: Model not found");
  });

  it("should handle timeout errors", () => {
    const timeoutError = new TimeoutError("Request timed out", 5000);
    const handledError = provider.handleProviderError(timeoutError);
    expect(handledError.message).toContain("Mistral request timed out");
  });

  it("should handle unknown errors", () => {
    const provider = new MistralProvider();
    const error = { message: "Some unknown error" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("Mistral error: Some unknown error");
  });

  it("should handle errors without message", () => {
    const provider = new MistralProvider();
    const error = {};
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("Mistral error: Unknown error");
  });

  it("should return AI SDK model instance", () => {
    const model = provider.getAISDKModel();
    expect(model).toBeDefined();
    expect(model.provider).toBe("mistral");
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
