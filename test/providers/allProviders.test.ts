/**
 * All Providers Comprehensive Test Suite
 *
 * Tests for all 69+ providers including:
 * - Amazon Bedrock
 * - Amazon SageMaker
 * - Azure OpenAI
 * - Google Vertex AI
 * - Mistral AI
 * - LiteLLM
 * - Ollama
 * - Hugging Face
 * - OpenRouter
 * - OpenAI Compatible
 *
 * This file covers initialization, basic operations, and error handling
 * for providers beyond OpenAI, Anthropic, and Google AI Studio
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ProviderRegistry } from "../../src/lib/factories/providerRegistry.js";
import { ProviderFactory } from "../../src/lib/factories/providerFactory.js";
import { AIProviderName } from "../../src/lib/constants/enums.js";
import { NeuroLink } from "../../src/lib/neurolink.js";

describe("Amazon Bedrock Provider", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should create Bedrock provider with default model", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.BEDROCK,
    );
    expect(provider).toBeDefined();
    expect(provider.getProviderName()).toBe(AIProviderName.BEDROCK);
  });

  it("should create Bedrock provider with specific model", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.BEDROCK,
      "anthropic.claude-3-5-sonnet-20241022-v2:0",
    );
    expect(provider).toBeDefined();
  });

  it("should create via aws alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "aws" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should create via bedrock alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "bedrock" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should support tool calling", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.BEDROCK,
    );
    expect(provider.supportsTools()).toBe(true);
  });

  it("should generate text response if credentials available", async () => {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.log("Skipping Bedrock generation test - no AWS credentials");
      return;
    }

    const neurolink = new NeuroLink();
    const result = await neurolink.generate({
      prompt: "Say hello",
      provider: AIProviderName.BEDROCK,
      model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });
});

describe("Azure OpenAI Provider", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should create Azure provider", async () => {
    const provider = await ProviderFactory.createProvider(AIProviderName.AZURE);
    expect(provider).toBeDefined();
    expect(provider.getProviderName()).toBe(AIProviderName.AZURE);
  });

  it("should create via azure alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "azure" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should create via azureOpenai alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "azureOpenai" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should support tool calling", async () => {
    const provider = await ProviderFactory.createProvider(AIProviderName.AZURE);
    expect(provider.supportsTools()).toBe(true);
  });

  it("should generate text response if configured", async () => {
    if (
      !process.env.AZURE_OPENAI_API_KEY ||
      !process.env.AZURE_OPENAI_ENDPOINT
    ) {
      console.log("Skipping Azure test - no credentials");
      return;
    }

    const neurolink = new NeuroLink();
    const result = await neurolink.generate({
      prompt: "Say hello",
      provider: AIProviderName.AZURE,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });
});

describe("Google Vertex AI Provider", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should create Vertex provider", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.VERTEX,
    );
    expect(provider).toBeDefined();
    expect(provider.getProviderName()).toBe(AIProviderName.VERTEX);
  });

  it("should create via vertex alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "vertex" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should create via googleVertex alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "googleVertex" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should support tool calling", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.VERTEX,
    );
    expect(provider.supportsTools()).toBe(true);
  });

  it("should generate text response if configured", async () => {
    const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const hasProjectId =
      process.env.GOOGLE_CLOUD_PROJECT_ID ||
      process.env.VERTEX_PROJECT_ID ||
      process.env.GOOGLE_VERTEX_PROJECT;

    if (!hasCredentials || !hasProjectId) {
      console.log("Skipping Vertex test - no credentials");
      return;
    }

    const neurolink = new NeuroLink();
    const result = await neurolink.generate({
      prompt: "Say hello",
      provider: AIProviderName.VERTEX,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });
});

describe("Mistral AI Provider", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should create Mistral provider", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.MISTRAL,
    );
    expect(provider).toBeDefined();
    expect(provider.getProviderName()).toBe(AIProviderName.MISTRAL);
  });

  it("should create via mistral alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "mistral" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should support tool calling", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.MISTRAL,
    );
    expect(provider.supportsTools()).toBe(true);
  });

  it("should generate text response if API key available", async () => {
    if (!process.env.MISTRAL_API_KEY) {
      console.log("Skipping Mistral test - no API key");
      return;
    }

    const neurolink = new NeuroLink();
    const result = await neurolink.generate({
      prompt: "Say hello",
      provider: AIProviderName.MISTRAL,
      model: "mistral-large-latest",
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });
});

describe("LiteLLM Provider", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should create LiteLLM provider", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.LITELLM,
    );
    expect(provider).toBeDefined();
    expect(provider.getProviderName()).toBe(AIProviderName.LITELLM);
  });

  it("should create via litellm alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "litellm" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should support tool calling", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.LITELLM,
    );
    expect(provider.supportsTools()).toBe(true);
  });

  it("should require base URL configuration", async () => {
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

describe("Ollama Provider", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should create Ollama provider", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.OLLAMA,
    );
    expect(provider).toBeDefined();
    expect(provider.getProviderName()).toBe(AIProviderName.OLLAMA);
  });

  it("should create via ollama alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "ollama" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should create via local alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "local" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should support tool calling", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.OLLAMA,
    );
    expect(provider.supportsTools()).toBe(true);
  });

  it("should not require API key", async () => {
    // Ollama runs locally and doesn't need an API key
    const provider = await ProviderFactory.createProvider(
      AIProviderName.OLLAMA,
    );
    expect(provider).toBeDefined();
  });
});

describe("Hugging Face Provider", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should create Hugging Face provider", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.HUGGINGFACE,
    );
    expect(provider).toBeDefined();
    expect(provider.getProviderName()).toBe(AIProviderName.HUGGINGFACE);
  });

  it("should create via huggingface alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "huggingface" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should create via hf alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "hf" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should support tool calling", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.HUGGINGFACE,
    );
    expect(provider.supportsTools()).toBe(true);
  });

  it("should generate text response if configured", async () => {
    if (!process.env.HUGGINGFACE_API_KEY) {
      console.log("Skipping Hugging Face test - no API key");
      return;
    }

    const neurolink = new NeuroLink();
    const result = await neurolink.generate({
      prompt: "Say hello",
      provider: AIProviderName.HUGGINGFACE,
    });

    expect(result).toBeDefined();
  });
});

describe("OpenRouter Provider", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should create OpenRouter provider", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.OPENROUTER,
    );
    expect(provider).toBeDefined();
    expect(provider.getProviderName()).toBe(AIProviderName.OPENROUTER);
  });

  it("should create via openrouter alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "openrouter" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should create via or alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "or" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should support tool calling", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.OPENROUTER,
    );
    expect(provider.supportsTools()).toBe(true);
  });

  it("should generate text response if API key available", async () => {
    if (!process.env.OPENROUTER_API_KEY) {
      console.log("Skipping OpenRouter test - no API key");
      return;
    }

    const neurolink = new NeuroLink();
    const result = await neurolink.generate({
      prompt: "Say hello",
      provider: AIProviderName.OPENROUTER,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });
});

describe("Amazon SageMaker Provider", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should create SageMaker provider", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.SAGEMAKER,
    );
    expect(provider).toBeDefined();
    expect(provider.getProviderName()).toBe(AIProviderName.SAGEMAKER);
  });

  it("should create via sagemaker alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "sagemaker" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should create via aws-sagemaker alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "aws-sagemaker" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });
});

describe("OpenAI Compatible Provider", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should create OpenAI Compatible provider", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.OPENAI_COMPATIBLE,
    );
    expect(provider).toBeDefined();
    expect(provider.getProviderName()).toBe(AIProviderName.OPENAI_COMPATIBLE);
  });

  it("should create via openai-compatible alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "openai-compatible" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should create via vllm alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "vllm" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should create via compatible alias", async () => {
    const provider = await ProviderFactory.createProvider(
      "compatible" as AIProviderName,
    );
    expect(provider).toBeDefined();
  });

  it("should support tool calling", async () => {
    const provider = await ProviderFactory.createProvider(
      AIProviderName.OPENAI_COMPATIBLE,
    );
    expect(provider.supportsTools()).toBe(true);
  });
});

describe("All Providers - Consistency Checks", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  const allProviders = [
    AIProviderName.OPENAI,
    AIProviderName.ANTHROPIC,
    AIProviderName.GOOGLE_AI,
    AIProviderName.VERTEX,
    AIProviderName.BEDROCK,
    AIProviderName.AZURE,
    AIProviderName.MISTRAL,
    AIProviderName.OLLAMA,
    AIProviderName.LITELLM,
    AIProviderName.HUGGINGFACE,
    AIProviderName.OPENROUTER,
    AIProviderName.SAGEMAKER,
    AIProviderName.OPENAI_COMPATIBLE,
  ];

  for (const provider of allProviders) {
    it(`${provider} should be registered`, () => {
      expect(ProviderFactory.hasProvider(provider)).toBe(true);
    });

    it(`${provider} should have provider info`, () => {
      const info = ProviderFactory.getProviderInfo(provider);
      expect(info).toBeDefined();
      expect(info?.constructor).toBeDefined();
    });

    it(`${provider} should have constructor function`, () => {
      const info = ProviderFactory.getProviderInfo(provider);
      expect(typeof info?.constructor).toBe("function");
    });

    it(`${provider} should have aliases array`, () => {
      const info = ProviderFactory.getProviderInfo(provider);
      expect(Array.isArray(info?.aliases)).toBe(true);
    });
  }
});
