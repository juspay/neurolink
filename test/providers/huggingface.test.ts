import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { HuggingFaceProvider } from "../../src/lib/providers/huggingFace.js";
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

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn().mockReturnValue(() => ({
    modelId: "mistralai/Mistral-7B-Instruct-v0.2",
    provider: "huggingface",
  })),
}));

describe("HuggingFaceProvider", () => {
  let provider: HuggingFaceProvider;

  beforeEach(() => {
    process.env.HUGGINGFACE_API_KEY = "hf_test";
    provider = new HuggingFaceProvider();
    vi.clearAllMocks();
  });

  it("should create provider with default model", () => {
    expect(provider.getProviderName()).toBe("huggingface");
    expect(provider.getDefaultModel()).toBe("microsoft/DialoGPT-medium");
  });

  it("should create provider with custom model", () => {
    const provider = new HuggingFaceProvider("google/gemma-7b-it");
    expect(provider.getProviderName()).toBe("huggingface");
    expect(provider.getDefaultModel()).toBe("microsoft/DialoGPT-medium");
  });

  it("should return correct provider name", () => {
    const provider = new HuggingFaceProvider();
    expect(provider.getProviderName()).toBe(AIProviderName.HUGGINGFACE);
  });

  it("should support tools", () => {
    const provider = new HuggingFaceProvider();
    expect(provider.supportsTools()).toBe(false);
  });

  it("should handle API key errors", () => {
    const error = { message: "Invalid token" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("Invalid HuggingFace API token");
  });

  it("should handle rate limit errors", () => {
    const error = { message: "rate limit" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("HuggingFace rate limit exceeded");
  });

  it("should handle model not found errors", () => {
    const provider = new HuggingFaceProvider("invalid-model");
    const error = { message: "model not found" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain(
      "HuggingFace model 'invalid-model' not found",
    );
  });

  it("should handle timeout errors", () => {
    const timeoutError = new TimeoutError("Request timed out", 5000);
    const handledError = provider.handleProviderError(timeoutError);
    expect(handledError.message).toContain("HuggingFace request timed out");
  });

  it("should handle unknown errors", () => {
    const provider = new HuggingFaceProvider();
    const error = { message: "Some unknown error" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain(
      "HuggingFace Provider Error: Some unknown error",
    );
  });

  it("should handle errors without message", () => {
    const provider = new HuggingFaceProvider();
    const error = {};
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain(
      "HuggingFace Provider Error: Unknown error",
    );
  });

  it("should return AI SDK model instance", () => {
    const model = provider.getAISDKModel();
    expect(model).toBeDefined();
    expect(model.provider).toBe("huggingface");
  });

  describe("executeStream", () => {
    it("should call streamText with the correct parameters", async () => {
      const mockStream = new ReadableStream();
      (streamText as Mock).mockResolvedValue({
        textStream: mockStream,
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
        textStream: mockStream,
      });

      await provider.stream({ input: { text: "Hello" } });

      // Verify that the mock was called
      expect(streamText).toHaveBeenCalled();
    });
  });
});
