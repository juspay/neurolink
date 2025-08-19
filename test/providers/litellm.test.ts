import { describe, it, expect, beforeAll, vi } from "vitest";
import { LiteLLMProvider } from "../../src/lib/providers/litellm.js";
import { AIProviderName } from "../../src/lib/types/index.js";

describe("LiteLLMProvider", () => {
  beforeAll(() => {
    // Set test environment variables
    process.env.LITELLM_BASE_URL = "http://localhost:4000";
    process.env.LITELLM_API_KEY = "sk-test";
    process.env.LITELLM_MODEL = "openai/gpt-4o-mini";
  });

  it("should create provider with default model", () => {
    const provider = new LiteLLMProvider();
    expect(provider.getProviderName()).toBe("litellm");
    expect(provider.modelName).toBe("openai/gpt-4o-mini");
  });

  it("should create provider with custom model", () => {
    const provider = new LiteLLMProvider("anthropic/claude-3-5-sonnet");
    expect(provider.getProviderName()).toBe("litellm");
    expect(provider.modelName).toBe("anthropic/claude-3-5-sonnet");
  });

  it("should return correct provider name", () => {
    const provider = new LiteLLMProvider();
    expect(provider.getProviderName()).toBe(AIProviderName.LITELLM);
  });

  it("should support tools", () => {
    const provider = new LiteLLMProvider();
    expect(provider.supportsTools()).toBe(true);
  });

  it("should handle proxy connection errors", () => {
    const provider = new LiteLLMProvider();
    const error = { message: "ECONNREFUSED" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain(
      "LiteLLM proxy server not available",
    );
    expect(handledError.message).toContain("http://localhost:4000");
  });

  it("should handle fetch errors", () => {
    const provider = new LiteLLMProvider();
    const error = { message: "Failed to fetch" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain(
      "LiteLLM proxy server not available",
    );
  });

  it("should handle API key errors", () => {
    const provider = new LiteLLMProvider();
    const error = { message: "API_KEY_INVALID" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("Invalid LiteLLM configuration");
    expect(handledError.message).toContain("LITELLM_API_KEY");
  });

  it("should handle rate limit errors", () => {
    const provider = new LiteLLMProvider();
    const error = { message: "rate limit exceeded" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("LiteLLM rate limit exceeded");
  });

  it("should handle model not found errors", () => {
    const provider = new LiteLLMProvider("invalid/model");
    const error = { message: "model invalid/model not found" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain(
      "Model 'invalid/model' not available",
    );
    expect(handledError.message).toContain("LiteLLM configuration");
  });

  it("should handle timeout errors", () => {
    const provider = new LiteLLMProvider();
    const timeoutError = new Error("Timeout");
    timeoutError.name = "TimeoutError";
    const handledError = provider.handleProviderError(timeoutError);
    expect(handledError.message).toContain("LiteLLM request timed out");
  });

  it("should handle unknown errors", () => {
    const provider = new LiteLLMProvider();
    const error = { message: "Some unknown error" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("LiteLLM error: Some unknown error");
  });

  it("should handle errors without message", () => {
    const provider = new LiteLLMProvider();
    const error = {};
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("LiteLLM error: Unknown error");
  });

  it("should have default model when no env var set", () => {
    // Temporarily remove env var
    const originalModel = process.env.LITELLM_MODEL;
    delete process.env.LITELLM_MODEL;

    const provider = new LiteLLMProvider();
    expect(provider.getDefaultModel()).toBe("openai/gpt-4o-mini");

    // Restore env var
    if (originalModel) {
      process.env.LITELLM_MODEL = originalModel;
    }
  });

  it("should use environment model when set", () => {
    process.env.LITELLM_MODEL = "anthropic/claude-3-haiku";
    const provider = new LiteLLMProvider();
    expect(provider.getDefaultModel()).toBe("anthropic/claude-3-haiku");

    // Reset to default
    process.env.LITELLM_MODEL = "openai/gpt-4o-mini";
  });

  it("should return AI SDK model instance", () => {
    const provider = new LiteLLMProvider();
    const model = provider.getAISDKModel();
    expect(model).toBeDefined();
    expect(typeof model).toBe("object");
    // Verify it has the expected LanguageModel interface properties
    expect(model).toHaveProperty("modelId");
    expect(model).toHaveProperty("provider");
  });

  it("should return available models list", async () => {
    const provider = new LiteLLMProvider();
    // Mock the fetchModelsFromAPI method to return a predictable list
    vi.spyOn(provider as any, "fetchModelsFromAPI").mockResolvedValue([
      "openai/gpt-4o",
      "anthropic/claude-3-5-sonnet",
      "google/gemini-pro",
    ]);
    const models = await provider.getAvailableModels();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    expect(models).toContain("openai/gpt-4o");
    expect(models).toContain("anthropic/claude-3-5-sonnet");
  });

  it("should use correct base URL from environment", () => {
    process.env.LITELLM_BASE_URL = "http://custom:5000";
    const provider = new LiteLLMProvider();

    const error = { message: "ECONNREFUSED" };
    const handledError = provider.handleProviderError(error);
    expect(handledError.message).toContain("http://custom:5000");

    // Reset to default
    process.env.LITELLM_BASE_URL = "http://localhost:4000";
  });
});
