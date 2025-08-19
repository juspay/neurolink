import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { OpenAIProvider } from "../../src/lib/providers/openAI.js";
import { streamText } from "ai";
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

vi.mock("../../src/lib/utils/providerConfig.js", () => ({
  validateApiKey: vi.fn().mockReturnValue("test-api-key"),
  createOpenAIConfig: vi.fn().mockReturnValue({ apiKey: "test-api-key" }),
  getProviderModel: vi.fn().mockReturnValue("gpt-4o"),
}));

describe("OpenAIProvider", () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider();
    vi.clearAllMocks();
  });

  it("should have the correct provider name", () => {
    expect(provider.getProviderName()).toBe(AIProviderName.OPENAI);
  });

  it("should return the default model", () => {
    expect(provider.getDefaultModel()).toBe("gpt-4o");
  });

  it("should return an AI SDK model instance", () => {
    const model = provider.getAISDKModel();
    expect(model).toBeDefined();
    expect(model.provider).toBe("openai.chat");
  });

  describe("handleProviderError", () => {
    it("should handle invalid API key errors", () => {
      const error = new Error("Invalid API key");
      expect(() => provider.handleProviderError(error)).toThrow(
        "Invalid OpenAI API key",
      );
    });

    it("should handle rate limit errors", () => {
      const error = new Error("rate limit exceeded");
      expect(() => provider.handleProviderError(error)).toThrow(
        "OpenAI rate limit exceeded",
      );
    });

    it("should handle generic errors", () => {
      const error = new Error("A generic error occurred");
      expect(() => provider.handleProviderError(error)).toThrow(
        "OpenAI error: A generic error occurred",
      );
    });
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

      // Since we have mocked the 'ai' module, the real streamText function is never imported.
      // This test case serves as a clear example of how mocking works.
      // If the test environment were not configured to use mocks, this test would fail
      // because it would attempt to make a real API call.
    });
  });
});
