import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { AmazonBedrockProvider as BedrockProvider } from "../../src/lib/providers/amazonBedrock.js";
import { TimeoutError } from "../../src/lib/utils/timeout.js";
import { AIProviderName } from "../../src/lib/types/index.js";
import { BedrockRuntimeClient, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime";

// Mock the external dependencies
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    streamText: vi.fn(),
    tool: vi.fn((def) => def),
  };
});

vi.mock("@ai-sdk/amazon-bedrock", () => ({
  createAmazonBedrock: vi.fn().mockReturnValue(() => ({
    modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
    provider: "amazon-bedrock",
  })),
}));

const mockSend = vi.fn();
vi.mock("@aws-sdk/client-bedrock-runtime", () => {
  const BedrockRuntimeClient = vi.fn().mockImplementation(() => ({
    config: { region: "us-east-1" },
    send: mockSend,
  }));
  class ConverseStreamCommand {
    constructor(public input: any) {}
  }
  return {
    BedrockRuntimeClient,
    ConverseCommand: vi.fn(),
    ConverseStreamCommand,
  };
});

describe("BedrockProvider", () => {
  let provider: BedrockProvider;

  beforeEach(() => {
    process.env.AWS_ACCESS_KEY_ID = "test";
    process.env.AWS_SECRET_ACCESS_KEY = "test";
    process.env.AWS_REGION = "us-east-1";
    provider = new BedrockProvider();
    vi.clearAllMocks();
    mockSend.mockClear();
  });

  it("should create provider with default model", () => {
    expect(provider.getProviderName()).toBe(AIProviderName.BEDROCK);
    expect(provider.getDefaultModel()).toBe(
      "anthropic.claude-3-sonnet-20240229-v1:0",
    );
  });

  it("should create provider with custom model", () => {
    const provider = new BedrockProvider("amazon.titan-text-express-v1");
    expect(provider.getProviderName()).toBe(AIProviderName.BEDROCK);
    expect(provider.getDefaultModel()).toBe(
      "anthropic.claude-3-sonnet-20240229-v1:0",
    );
  });

  it("should return correct provider name", () => {
    const provider = new BedrockProvider();
    expect(provider.getProviderName()).toBe(AIProviderName.BEDROCK);
  });

  it("should support tools", () => {
    const provider = new BedrockProvider();
    expect(provider.supportsTools()).toBe(true);
  });

  it("should handle API key errors", () => {
    const error = new Error("AccessDeniedException");
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("AWS Bedrock access denied");
  });

  it("should handle rate limit errors", () => {
    const error = new Error("ThrottlingException");
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("AWS Bedrock error: ThrottlingException");
  });

  it("should handle model not found errors", () => {
    const error = new Error("ValidationException: The model is not supported");
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("AWS Bedrock validation error: ValidationException: The model is not supported");
  });

  it("should handle timeout errors", () => {
    const timeoutError = new TimeoutError("Request timed out", 5000);
    const handledError = provider.handleProviderError(timeoutError);
    expect(handledError.message).toContain("AWS Bedrock error: Request timed out");
  });

  it("should handle unknown errors", () => {
    const error = { message: "Some unknown error" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toBe("AWS Bedrock error: [object Object]");
  });

  it("should handle errors without message", () => {
    const error = {};
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toBe("AWS Bedrock error: [object Object]");
  });

  describe("executeStream", () => {
    it("should call ConverseStreamCommand with the correct parameters", async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue({
            contentBlockDelta: { delta: { text: "Hello, world!" } },
          });
          controller.enqueue({ messageStop: { stopReason: "end_turn" } });
          controller.close();
        },
      });
      mockSend.mockResolvedValue({ stream: mockStream });

      await provider.stream({ input: { text: "Hello" } });

      expect(mockSend).toHaveBeenCalledWith(expect.any(ConverseStreamCommand));
      const commandInstance = (mockSend.mock.calls[0][0] as any);
      expect(commandInstance.input.modelId).toBe("anthropic.claude-3-sonnet-20240229-v1:0");
      expect(commandInstance.input.messages).toEqual([
        { role: "user", content: [{ text: "Hello" }] },
      ]);
    });

    it("should not make a real API call", async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });
      mockSend.mockResolvedValue({ stream: mockStream });

      await provider.stream({ input: { text: "Hello" } });

      // Verify that the mock was called
      expect(mockSend).toHaveBeenCalled();
    });
  });
});
