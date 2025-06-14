import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import { OpenAI } from "../lib/providers/openAI.js";
import { AmazonBedrock } from "../lib/providers/amazonBedrock.js";
import { GoogleVertexAI } from "../lib/providers/googleVertexAI.js";
import { GoogleAIStudio } from "../lib/providers/googleAIStudio.js";
import { HuggingFace } from "../lib/providers/huggingFace.js";
import { Ollama } from "../lib/providers/ollama.js";
import { MistralAI } from "../lib/providers/mistralAI.js";
import { AIProviderFactory } from "../lib/core/factory.js";

// Mock environment setup
beforeAll(() => {
  // Set up test environment variables for all providers
  process.env.OPENAI_API_KEY = "test-openai-key";
  process.env.AWS_ACCESS_KEY_ID = "test-aws-key-id";
  process.env.AWS_SECRET_ACCESS_KEY = "test-aws-secret";
  process.env.AWS_REGION = "us-east-1";
  process.env.GOOGLE_APPLICATION_CREDENTIALS = "test-google-credentials.json";
  process.env.GOOGLE_CLOUD_PROJECT = "test-project";
  process.env.GOOGLE_VERTEX_PROJECT = "test-vertex-project";
  process.env.GOOGLE_VERTEX_LOCATION = "us-central1";
  process.env.GOOGLE_AI_API_KEY = "test-google-ai-key";
  process.env.GOOGLE_AI_MODEL = "gemini-1.5-pro-latest";
  process.env.HUGGINGFACE_API_KEY = "test-hf-key";
  process.env.HUGGINGFACE_MODEL = "microsoft/DialoGPT-medium";
  process.env.OLLAMA_BASE_URL = "http://localhost:11434";
  process.env.OLLAMA_MODEL = "llama2";
  process.env.MISTRAL_API_KEY = "test-mistral-key";
  process.env.MISTRAL_MODEL = "mistral-small";
});

// Mock the AI SDK functions
vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => ({
    // Mock what the OpenAI model would return
  })),
}));

// Mock the Amazon Bedrock SDK - IMPORTANT: createAmazonBedrock returns a function!
vi.mock("@ai-sdk/amazon-bedrock", () => ({
  amazonBedrock: vi.fn(() => ({
    // Mock what the Bedrock model would return
  })),
  createAmazonBedrock: vi.fn(() => {
    // This needs to return a function that can be called with modelName
    return vi.fn(() => ({
      // Mock the Bedrock model instance
    }));
  }),
}));

vi.mock("@ai-sdk/google-vertex", () => ({
  googleVertexAI: vi.fn(() => ({
    // Mock what the Vertex AI model would return
  })),
}));

// Mock the AI SDK core functions
vi.mock("ai", () => ({
  streamText: vi.fn(() => ({
    textStream: {
      [Symbol.asyncIterator]: async function* () {
        yield "test response";
      },
    },
  })),
  generateText: vi.fn(() => ({
    text: "test response",
    usage: {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    },
  })),
  Output: { object: vi.fn() },
}));

describe("NeuroLink AI Providers", () => {
  describe("OpenAI Provider", () => {
    it("should create OpenAI provider successfully", () => {
      const provider = new OpenAI("gpt-4");

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe("OpenAI");
    });

    it("should be an AI provider", () => {
      const provider = new OpenAI("gpt-4");

      expect(provider).toBeDefined();
      expect(typeof provider.generateText).toBe("function");
    });
  });

  describe("Amazon Bedrock Provider", () => {
    it("should create Bedrock provider successfully", () => {
      const provider = new AmazonBedrock(
        "anthropic.claude-3-sonnet-20240229-v1:0",
      );

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe("AmazonBedrock");
    });

    it("should be an AI provider", () => {
      const provider = new AmazonBedrock(
        "anthropic.claude-3-sonnet-20240229-v1:0",
      );

      expect(provider).toBeDefined();
      expect(typeof provider.generateText).toBe("function");
    });
  });

  describe("Google Vertex AI Provider", () => {
    it("should create Vertex AI provider successfully", () => {
      const provider = new GoogleVertexAI("gemini-pro");

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe("GoogleVertexAI");
    });

    it("should be an AI provider", () => {
      const provider = new GoogleVertexAI("gemini-pro");

      expect(provider).toBeDefined();
      expect(typeof provider.generateText).toBe("function");
    });
  });

  describe("Google AI Studio Provider", () => {
    it("should create Google AI Studio provider successfully", () => {
      const provider = new GoogleAIStudio("gemini-1.5-pro-latest");

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe("GoogleAIStudio");
    });

    it("should be an AI provider", () => {
      const provider = new GoogleAIStudio("gemini-1.5-pro-latest");

      expect(provider).toBeDefined();
      expect(typeof provider.generateText).toBe("function");
    });

    it("should support different Gemini models", () => {
      const proProvider = new GoogleAIStudio("gemini-1.5-pro-latest");
      const flashProvider = new GoogleAIStudio("gemini-1.5-flash-latest");
      const expProvider = new GoogleAIStudio("gemini-2.0-flash-exp");

      expect(proProvider).toBeDefined();
      expect(flashProvider).toBeDefined();
      expect(expProvider).toBeDefined();
    });
  });

  describe("HuggingFace Provider", () => {
    it("should create HuggingFace provider successfully", () => {
      const provider = new HuggingFace("microsoft/DialoGPT-medium");

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe("HuggingFace");
    });

    it("should be an AI provider", () => {
      const provider = new HuggingFace("microsoft/DialoGPT-medium");

      expect(provider).toBeDefined();
      expect(typeof provider.generateText).toBe("function");
      expect(typeof provider.streamText).toBe("function");
    });

    it("should support different HuggingFace models", () => {
      const dialogProvider = new HuggingFace("microsoft/DialoGPT-large");
      const gptProvider = new HuggingFace("gpt2");
      const llamaProvider = new HuggingFace("meta-llama/Llama-2-7b-chat-hf");

      expect(dialogProvider).toBeDefined();
      expect(gptProvider).toBeDefined();
      expect(llamaProvider).toBeDefined();
    });

    it("should use default model when none specified", () => {
      const provider = new HuggingFace();

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe("HuggingFace");
    });
  });

  describe("Ollama Provider", () => {
    it("should create Ollama provider successfully", () => {
      const provider = new Ollama("llama2");

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe("Ollama");
    });

    it("should be an AI provider", () => {
      const provider = new Ollama("llama2");

      expect(provider).toBeDefined();
      expect(typeof provider.generateText).toBe("function");
      expect(typeof provider.streamText).toBe("function");
    });

    it("should support different Ollama models", () => {
      const llamaProvider = new Ollama("llama2");
      const codeProvider = new Ollama("codellama");
      const mistralProvider = new Ollama("mistral");

      expect(llamaProvider).toBeDefined();
      expect(codeProvider).toBeDefined();
      expect(mistralProvider).toBeDefined();
    });

    it("should use default model when none specified", () => {
      const provider = new Ollama();

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe("Ollama");
    });
  });

  describe("MistralAI Provider", () => {
    it("should create MistralAI provider successfully", () => {
      const provider = new MistralAI("mistral-small");

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe("MistralAI");
    });

    it("should be an AI provider", () => {
      const provider = new MistralAI("mistral-small");

      expect(provider).toBeDefined();
      expect(typeof provider.generateText).toBe("function");
      expect(typeof provider.streamText).toBe("function");
    });

    it("should support different Mistral models", () => {
      const tinyProvider = new MistralAI("mistral-tiny");
      const smallProvider = new MistralAI("mistral-small");
      const mediumProvider = new MistralAI("mistral-medium");
      const largeProvider = new MistralAI("mistral-large");

      expect(tinyProvider).toBeDefined();
      expect(smallProvider).toBeDefined();
      expect(mediumProvider).toBeDefined();
      expect(largeProvider).toBeDefined();
    });

    it("should use default model when none specified", () => {
      const provider = new MistralAI();

      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe("MistralAI");
    });
  });

  describe("AI Provider Factory", () => {
    beforeEach(() => {
      // Ensure environment variables are set for each test
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.AWS_ACCESS_KEY_ID = "test-aws-key-id";
      process.env.AWS_SECRET_ACCESS_KEY = "test-aws-secret";
      process.env.AWS_REGION = "us-east-1";
      process.env.GOOGLE_APPLICATION_CREDENTIALS =
        "test-google-credentials.json";
    });

    it("should create providers by name", () => {
      const openaiProvider = AIProviderFactory.createProvider("openai");
      const bedrockProvider = AIProviderFactory.createProvider("bedrock");
      const vertexProvider = AIProviderFactory.createProvider("vertex");
      const googleAIProvider = AIProviderFactory.createProvider("google-ai");
      const huggingfaceProvider =
        AIProviderFactory.createProvider("huggingface");
      const ollamaProvider = AIProviderFactory.createProvider("ollama");
      const mistralProvider = AIProviderFactory.createProvider("mistral");

      expect(openaiProvider).toBeDefined();
      expect(bedrockProvider).toBeDefined();
      expect(vertexProvider).toBeDefined();
      expect(googleAIProvider).toBeDefined();
      expect(huggingfaceProvider).toBeDefined();
      expect(huggingfaceProvider.constructor.name).toBe("HuggingFace");
      expect(ollamaProvider).toBeDefined();
      expect(ollamaProvider.constructor.name).toBe("Ollama");
      expect(mistralProvider).toBeDefined();
      expect(mistralProvider.constructor.name).toBe("MistralAI");
    });

    it("should create HuggingFace provider with aliases", () => {
      const hfProvider = AIProviderFactory.createProvider("hf");
      const huggingFaceProvider =
        AIProviderFactory.createProvider("hugging-face");

      expect(hfProvider).toBeDefined();
      expect(huggingFaceProvider).toBeDefined();
      expect(hfProvider.constructor.name).toBe("HuggingFace");
      expect(huggingFaceProvider.constructor.name).toBe("HuggingFace");
    });

    it("should create Mistral provider with aliases", () => {
      const mistralProvider = AIProviderFactory.createProvider("mistral");
      const mistralAiProvider = AIProviderFactory.createProvider("mistral-ai");

      expect(mistralProvider).toBeDefined();
      expect(mistralAiProvider).toBeDefined();
      expect(mistralProvider.constructor.name).toBe("MistralAI");
      expect(mistralAiProvider.constructor.name).toBe("MistralAI");
    });

    it("should create best available provider", () => {
      const provider = AIProviderFactory.createBestProvider();
      expect(provider).toBeDefined();
      expect(typeof provider.generateText).toBe("function");
    });

    it("should create provider with fallback", () => {
      const { primary, fallback } =
        AIProviderFactory.createProviderWithFallback("openai", "bedrock");
      expect(primary).toBeDefined();
      expect(fallback).toBeDefined();
      expect(primary.constructor.name).toBe("OpenAI");
      expect(fallback.constructor.name).toBe("AmazonBedrock");
    });

    it("should throw error for unknown provider", () => {
      expect(() => {
        AIProviderFactory.createProvider("unknown");
      }).toThrow("Unknown provider: unknown");
    });
  });
});
