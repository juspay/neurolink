import { describe, it, expect } from "vitest";
import { ProviderImageAdapter } from "../../../src/lib/adapters/providerImageAdapter.js";

/**
 * Test suite for ProviderImageAdapter switch statement coverage
 * Validates that all vision-capable providers and their aliases route correctly
 */
describe("ProviderImageAdapter - Provider Switch Cases", () => {
  const testText = "Test prompt";
  const testImages = [Buffer.from("fake-image-data")];
  const testModel = "test-model";

  describe("OpenAI and compatible providers", () => {
    it("should handle 'openai' provider", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "openai",
        "gpt-4o",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("messages");
    });

    it("should handle 'litellm' provider", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "litellm",
        "gpt-4o",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("messages");
    });

    it("should handle 'openai-compatible' provider", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "openai-compatible",
        "gpt-4o",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("messages");
    });

    it("should handle 'openrouter' alias", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "openrouter",
        "gpt-4o",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("messages");
    });

    it("should handle 'vllm' alias", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "vllm",
        "gpt-4o",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("messages");
    });

    it("should handle 'compatible' alias", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "compatible",
        "gpt-4o",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("messages");
    });

    it("should handle 'mistral' provider", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "mistral",
        "pixtral-12b",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("messages");
    });

    it("should handle 'ollama' provider", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "ollama",
        "llava",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("messages");
    });
  });

  describe("Azure providers", () => {
    it("should handle 'azure' provider", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "azure",
        "gpt-4o",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("messages");
    });

    it("should handle 'azure-openai' alias", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "azure-openai",
        "gpt-4o",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("messages");
    });

    it("should handle 'azureopenai' alias", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "azureopenai",
        "gpt-4o",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("messages");
    });
  });

  describe("Google providers", () => {
    it("should handle 'google-ai' provider", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "google-ai",
        "gemini-2.5-flash",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("contents");
    });

    it("should handle 'google' alias", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "google",
        "gemini-2.5-flash",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("contents");
    });

    it("should handle 'gemini' alias", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "gemini",
        "gemini-2.5-flash",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("contents");
    });

    it("should handle 'googleaistudio' alias", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "googleaistudio",
        "gemini-2.5-flash",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("contents");
    });

    it("should handle 'google-ai-studio' alias", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "google-ai-studio",
        "gemini-2.5-flash",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("contents");
    });

    it("should handle 'vertex' provider with Gemini model", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "vertex",
        "gemini-2.5-flash",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("contents");
    });

    it("should handle 'google-vertex' alias", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "google-vertex",
        "gemini-2.5-flash",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("contents");
    });

    it("should handle 'googlevertex' alias", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "googlevertex",
        "gemini-2.5-flash",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("contents");
    });
  });

  describe("Anthropic and Bedrock providers", () => {
    it("should handle 'anthropic' provider", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "anthropic",
        "claude-3-5-sonnet",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("messages");
    });

    it("should handle 'bedrock' provider", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "bedrock",
        "claude-3-5-sonnet",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("messages");
    });

    it("should handle 'aws' alias for bedrock", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "aws",
        "claude-3-5-sonnet",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("messages");
    });

    it("should handle vertex with Claude model using Anthropic format", async () => {
      const result = await ProviderImageAdapter.adaptForProvider(
        testText,
        testImages,
        "vertex",
        "claude-3-5-sonnet",
      );
      expect(result).toBeDefined();
      expect(result).toHaveProperty("messages");
    });
  });

  describe("Error handling", () => {
    it("should throw error with list of supported providers for unsupported provider", async () => {
      await expect(
        ProviderImageAdapter.adaptForProvider(
          testText,
          testImages,
          "unsupported-provider",
          testModel,
        ),
      ).rejects.toThrow(/Supported providers:/);
    });

    it("should throw error listing all VISION_CAPABILITIES providers", async () => {
      try {
        await ProviderImageAdapter.adaptForProvider(
          testText,
          testImages,
          "invalid-provider",
          testModel,
        );
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain("openai");
        expect(errorMessage).toContain("anthropic");
        expect(errorMessage).toContain("bedrock");
        expect(errorMessage).toContain("litellm");
        expect(errorMessage).toContain("mistral");
      }
    });
  });

  describe("Vision capability validation", () => {
    it("should validate Bedrock supports vision models", () => {
      const supports = ProviderImageAdapter.supportsVision(
        "bedrock",
        "claude-3-5-sonnet",
      );
      expect(supports).toBe(true);
    });

    it("should validate LiteLLM supports vision models", () => {
      const supports = ProviderImageAdapter.supportsVision("litellm", "gpt-4o");
      expect(supports).toBe(true);
    });

    it("should validate Mistral supports vision models", () => {
      const supports = ProviderImageAdapter.supportsVision(
        "mistral",
        "pixtral-12b",
      );
      expect(supports).toBe(true);
    });

    it("should return list of supported models for bedrock", () => {
      const models = ProviderImageAdapter.getSupportedModels("bedrock");
      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain("claude-3-5-sonnet");
    });

    it("should return list of supported models for litellm", () => {
      const models = ProviderImageAdapter.getSupportedModels("litellm");
      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe("Provider listing", () => {
    it("should list all vision-capable providers", () => {
      const providers = ProviderImageAdapter.getVisionProviders();
      expect(providers).toBeInstanceOf(Array);
      expect(providers).toContain("openai");
      expect(providers).toContain("anthropic");
      expect(providers).toContain("bedrock");
      expect(providers).toContain("litellm");
      expect(providers).toContain("mistral");
      expect(providers).toContain("google-ai");
      expect(providers).toContain("vertex");
      expect(providers).toContain("azure");
      expect(providers).toContain("ollama");
    });
  });
});
