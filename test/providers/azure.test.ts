import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import AzureProvider from "../../src/lib/providers/azureOpenai.js";
import { streamText } from "ai";
import { TimeoutError } from "../../src/lib/utils/timeout.js";
import { AIProviderName } from "$lib/types/providers.js";

// Mock the external dependencies
vi.mock("ai", () => ({
  streamText: vi.fn(),
}));

vi.mock("@ai-sdk/azure", () => ({
  createAzure: vi.fn().mockReturnValue(() => ({
    modelId: "gpt-4o",
    provider: "azure",
  })),
}));

describe("AzureProvider", () => {
  let provider: AzureProvider;

  beforeEach(() => {
    process.env.AZURE_OPENAI_API_KEY = "test";
    process.env.AZURE_OPENAI_ENDPOINT = "https://test.openai.azure.com/";
    process.env.AZURE_OPENAI_DEPLOYMENT = "gpt-4o";
    provider = new AzureProvider();
    vi.clearAllMocks();
  });

  it("should create provider with default model", () => {
    expect(provider.getProviderName()).toBe("azure");
    expect(provider.getDefaultModel()).toBe("gpt-4o");
  });

  it("should create provider with custom model", () => {
    const provider = new AzureProvider("gpt-35-turbo");
    expect(provider.getProviderName()).toBe("azure");
    expect(provider.getDefaultModel()).toBe("gpt-35-turbo");
  });

  it("should return correct provider name", () => {
    const provider = new AzureProvider();
    expect(provider.getProviderName()).toBe(AIProviderName.AZURE);
  });

  it("should support tools", () => {
    const provider = new AzureProvider();
    expect(provider.supportsTools()).toBe(true);
  });

  it("should handle API key errors", () => {
    const error = { message: "401" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain(
      "Invalid Azure OpenAI API key or endpoint.",
    );
  });

  it("should handle rate limit errors", () => {
    const error = { message: "429" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("Azure OpenAI error: 429");
  });

  it("should handle model not found errors", () => {
    const provider = new AzureProvider("invalid-model");
    const error = { message: "The model is not supported" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain(
      "Azure OpenAI error: The model is not supported",
    );
  });

  it("should handle timeout errors", () => {
    const timeoutError = new TimeoutError("Request timed out", 5000);
    const handledError = provider.handleProviderError(timeoutError);
    expect(handledError.message).toContain(
      "Azure OpenAI error: Request timed out",
    );
  });

  it("should handle unknown errors", () => {
    const provider = new AzureProvider();
    const error = { message: "Some unknown error" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain(
      "Azure OpenAI error: Some unknown error",
    );
  });

  it("should handle errors without message", () => {
    const provider = new AzureProvider();
    const error = {};
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("Azure OpenAI error: Unknown error");
  });

  it("should return AI SDK model instance", () => {
    const model = provider.getAISDKModel();
    expect(model).toBeDefined();
    expect(model.provider).toBe("azure");
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
