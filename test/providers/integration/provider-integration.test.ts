/**
 * Provider Integration Tests
 *
 * Integration tests for provider creation, configuration,
 * and interaction with the NeuroLink SDK.
 *
 * These tests verify that providers can be:
 * - Created via the factory system
 * - Configured with appropriate options
 * - Used with the NeuroLink SDK methods
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { ProviderRegistry } from "../../../src/lib/factories/providerRegistry.js";
import { ProviderFactory } from "../../../src/lib/factories/providerFactory.js";
import { AIProviderName } from "../../../src/lib/constants/enums.js";

describe("Provider Integration - Factory Creation", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  describe("OpenAI Provider", () => {
    it("should create OpenAI provider with default model", async () => {
      // Skip if no API key
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping OpenAI test - no API key");
        return;
      }

      const provider = await ProviderFactory.createProvider(
        AIProviderName.OPENAI,
      );
      expect(provider).toBeDefined();
    });

    it("should create OpenAI provider with specific model", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping OpenAI test - no API key");
        return;
      }

      const provider = await ProviderFactory.createProvider(
        AIProviderName.OPENAI,
        "gpt-4o-mini",
      );
      expect(provider).toBeDefined();
    });

    it("should create OpenAI provider via alias", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping OpenAI test - no API key");
        return;
      }

      const provider = await ProviderFactory.createProvider(
        "gpt" as AIProviderName,
      );
      expect(provider).toBeDefined();
    });
  });

  describe("Anthropic Provider", () => {
    it("should create Anthropic provider with default model", async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log("Skipping Anthropic test - no API key");
        return;
      }

      const provider = await ProviderFactory.createProvider(
        AIProviderName.ANTHROPIC,
      );
      expect(provider).toBeDefined();
    });

    it("should create Anthropic provider via alias", async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log("Skipping Anthropic test - no API key");
        return;
      }

      const provider = await ProviderFactory.createProvider(
        "claude" as AIProviderName,
      );
      expect(provider).toBeDefined();
    });
  });

  describe("Google AI Studio Provider", () => {
    it("should create Google AI provider with default model", async () => {
      if (
        !process.env.GOOGLE_AI_API_KEY &&
        !process.env.GOOGLE_GENERATIVE_AI_API_KEY
      ) {
        console.log("Skipping Google AI test - no API key");
        return;
      }

      const provider = await ProviderFactory.createProvider(
        AIProviderName.GOOGLE_AI,
      );
      expect(provider).toBeDefined();
    });

    it("should create Google AI provider via gemini alias", async () => {
      if (
        !process.env.GOOGLE_AI_API_KEY &&
        !process.env.GOOGLE_GENERATIVE_AI_API_KEY
      ) {
        console.log("Skipping Google AI test - no API key");
        return;
      }

      const provider = await ProviderFactory.createProvider(
        "gemini" as AIProviderName,
      );
      expect(provider).toBeDefined();
    });
  });

  describe("Mistral Provider", () => {
    it("should create Mistral provider with default model", async () => {
      if (!process.env.MISTRAL_API_KEY) {
        console.log("Skipping Mistral test - no API key");
        return;
      }

      const provider = await ProviderFactory.createProvider(
        AIProviderName.MISTRAL,
      );
      expect(provider).toBeDefined();
    });
  });

  describe("OpenRouter Provider", () => {
    it("should create OpenRouter provider with default model", async () => {
      if (!process.env.OPENROUTER_API_KEY) {
        console.log("Skipping OpenRouter test - no API key");
        return;
      }

      const provider = await ProviderFactory.createProvider(
        AIProviderName.OPENROUTER,
      );
      expect(provider).toBeDefined();
    });
  });

  describe("Cloud Providers - Bedrock", () => {
    it("should create Bedrock provider with region", async () => {
      if (
        !process.env.AWS_ACCESS_KEY_ID ||
        !process.env.AWS_SECRET_ACCESS_KEY
      ) {
        console.log("Skipping Bedrock test - no AWS credentials");
        return;
      }

      const provider = await ProviderFactory.createProvider(
        AIProviderName.BEDROCK,
        "anthropic.claude-3-5-sonnet",
        undefined,
        "us-east-1",
      );
      expect(provider).toBeDefined();
    });

    it("should create Bedrock provider via aws alias", async () => {
      if (
        !process.env.AWS_ACCESS_KEY_ID ||
        !process.env.AWS_SECRET_ACCESS_KEY
      ) {
        console.log("Skipping Bedrock test - no AWS credentials");
        return;
      }

      const provider = await ProviderFactory.createProvider(
        "aws" as AIProviderName,
      );
      expect(provider).toBeDefined();
    });
  });

  describe("Cloud Providers - Azure", () => {
    it("should create Azure provider", async () => {
      if (
        !process.env.AZURE_OPENAI_API_KEY ||
        !process.env.AZURE_OPENAI_ENDPOINT
      ) {
        console.log("Skipping Azure test - no credentials");
        return;
      }

      const provider = await ProviderFactory.createProvider(
        AIProviderName.AZURE,
      );
      expect(provider).toBeDefined();
    });
  });

  describe("Cloud Providers - Vertex AI", () => {
    it("should create Vertex provider with region", async () => {
      // Vertex requires both credentials and project ID
      const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const hasProjectId =
        process.env.GOOGLE_CLOUD_PROJECT_ID ||
        process.env.VERTEX_PROJECT_ID ||
        process.env.GOOGLE_VERTEX_PROJECT ||
        process.env.GOOGLE_CLOUD_PROJECT;

      if (!hasCredentials || !hasProjectId) {
        console.log("Skipping Vertex test - no credentials or project ID");
        return;
      }

      const provider = await ProviderFactory.createProvider(
        AIProviderName.VERTEX,
        "gemini-2.5-flash",
        undefined,
        "us-central1",
      );
      expect(provider).toBeDefined();
    });
  });

  describe("Local Providers - Ollama", () => {
    it("should create Ollama provider", async () => {
      // Ollama doesn't require API key but needs local server
      const provider = await ProviderFactory.createProvider(
        AIProviderName.OLLAMA,
      );
      expect(provider).toBeDefined();
    });

    it("should create Ollama via local alias", async () => {
      const provider = await ProviderFactory.createProvider(
        "local" as AIProviderName,
      );
      expect(provider).toBeDefined();
    });
  });

  describe("Proxy Providers - LiteLLM", () => {
    it("should create LiteLLM provider", async () => {
      if (!process.env.LITELLM_BASE_URL) {
        console.log("Skipping LiteLLM test - no base URL");
        return;
      }

      const provider = await ProviderFactory.createProvider(
        AIProviderName.LITELLM,
      );
      expect(provider).toBeDefined();
    });
  });
});

describe("Provider Integration - Error Handling", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should throw descriptive error for unknown provider", async () => {
    await expect(
      ProviderFactory.createProvider("unknown-provider" as AIProviderName),
    ).rejects.toThrow(/Unknown provider/);
  });

  it("should include available providers in error message", async () => {
    try {
      await ProviderFactory.createProvider("nonexistent" as AIProviderName);
      expect.fail("Should have thrown");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("Available providers:");
      expect(message).toContain("openai");
    }
  });
});

describe("Provider Integration - Multi-Provider Scenarios", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should create multiple providers concurrently", async () => {
    const providerPromises = [
      ProviderFactory.createProvider(AIProviderName.OLLAMA),
    ];

    // Add more providers if keys are available
    if (process.env.OPENAI_API_KEY) {
      providerPromises.push(
        ProviderFactory.createProvider(AIProviderName.OPENAI),
      );
    }

    const providers = await Promise.all(providerPromises);

    expect(providers.length).toBeGreaterThanOrEqual(1);
    for (const provider of providers) {
      expect(provider).toBeDefined();
    }
  });

  it("should handle mixed provider success/failure", async () => {
    const results: { provider: string; success: boolean; error?: string }[] =
      [];

    // Try to create multiple providers
    const providersToTry = [
      AIProviderName.OLLAMA, // Should work (no API key needed)
      "invalid-provider" as AIProviderName, // Should fail
    ];

    for (const providerName of providersToTry) {
      try {
        await ProviderFactory.createProvider(providerName);
        results.push({ provider: providerName, success: true });
      } catch (error) {
        results.push({
          provider: providerName,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    // At least one should succeed (Ollama)
    expect(results.some((r) => r.success)).toBe(true);

    // At least one should fail (invalid-provider)
    expect(results.some((r) => !r.success)).toBe(true);
  });
});

describe("Provider Integration - Configuration Options", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should pass SDK instance to provider", async () => {
    const mockSdk = { config: { debug: true } };

    const provider = await ProviderFactory.createProvider(
      AIProviderName.OLLAMA,
      undefined,
      mockSdk,
    );

    expect(provider).toBeDefined();
  });

  it("should override default model", async () => {
    const customModel = "custom-model-name";

    const provider = await ProviderFactory.createProvider(
      AIProviderName.OLLAMA,
      customModel,
    );

    expect(provider).toBeDefined();
  });
});

describe("Provider Integration - Model Enum Consistency", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  const providerModelTests = [
    {
      provider: AIProviderName.OPENAI,
      models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
      envKey: "OPENAI_API_KEY",
    },
    {
      provider: AIProviderName.ANTHROPIC,
      models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022"],
      envKey: "ANTHROPIC_API_KEY",
    },
    {
      provider: AIProviderName.GOOGLE_AI,
      models: ["gemini-2.5-flash", "gemini-2.0-flash"],
      envKey: "GOOGLE_AI_API_KEY",
    },
    {
      provider: AIProviderName.MISTRAL,
      models: ["mistral-large-latest", "mistral-small-latest"],
      envKey: "MISTRAL_API_KEY",
    },
    {
      provider: AIProviderName.OLLAMA,
      models: ["llama3.2:latest", "mistral:latest"],
      envKey: null, // No key needed
    },
  ];

  for (const { provider, models, envKey } of providerModelTests) {
    describe(`${provider} model consistency`, () => {
      for (const model of models) {
        it(`should accept model: ${model}`, async () => {
          if (envKey && !process.env[envKey]) {
            console.log(`Skipping ${provider} test - no ${envKey}`);
            return;
          }

          const providerInstance = await ProviderFactory.createProvider(
            provider,
            model,
          );

          expect(providerInstance).toBeDefined();
        });
      }
    });
  }
});
