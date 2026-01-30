/**
 * Provider Capabilities Tests
 *
 * Tests to verify all providers support expected capabilities and configurations:
 * - Provider registration and info
 * - Model variants support
 * - Configuration options
 * - Alias resolution
 *
 * Note: Tests that require actual provider instances with API calls are in integration tests
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ProviderRegistry } from "../../src/lib/factories/providerRegistry.js";
import { ProviderFactory } from "../../src/lib/factories/providerFactory.js";
import { AIProviderName } from "../../src/lib/constants/enums.js";

describe("Provider Capabilities - Registration", () => {
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
      expect(typeof info?.constructor).toBe("function");
    });
  }
});

describe("Provider Capabilities - Aliases", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  const providerAliases = {
    [AIProviderName.OPENAI]: ["gpt", "chatgpt"],
    [AIProviderName.ANTHROPIC]: ["claude", "anthropic"],
    [AIProviderName.GOOGLE_AI]: [
      "google",
      "gemini",
      "googleAiStudio",
      "google-ai",
    ],
    [AIProviderName.VERTEX]: ["vertex", "googleVertex"],
    [AIProviderName.BEDROCK]: ["bedrock", "aws"],
    [AIProviderName.AZURE]: ["azure", "azureOpenai"],
    [AIProviderName.MISTRAL]: ["mistral"],
    [AIProviderName.OLLAMA]: ["ollama", "local"],
    [AIProviderName.LITELLM]: ["litellm"],
    [AIProviderName.HUGGINGFACE]: ["huggingface", "hf"],
    [AIProviderName.OPENROUTER]: ["openrouter", "or"],
    [AIProviderName.SAGEMAKER]: ["sagemaker", "aws-sagemaker"],
    [AIProviderName.OPENAI_COMPATIBLE]: [
      "openai-compatible",
      "vllm",
      "compatible",
    ],
  };

  for (const [provider, aliases] of Object.entries(providerAliases)) {
    describe(`${provider} aliases`, () => {
      for (const alias of aliases) {
        it(`should recognize alias "${alias}"`, () => {
          expect(ProviderFactory.hasProvider(alias)).toBe(true);
        });
      }
    });
  }
});

describe("Provider Capabilities - Default Models", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("OpenAI should have gpt- model as default", () => {
    const info = ProviderFactory.getProviderInfo(AIProviderName.OPENAI);
    expect(info?.defaultModel).toBeDefined();
    expect(info?.defaultModel).toMatch(/^gpt-/);
  });

  it("Anthropic should have claude model as default", () => {
    const info = ProviderFactory.getProviderInfo(AIProviderName.ANTHROPIC);
    expect(info?.defaultModel).toBeDefined();
    expect(info?.defaultModel).toMatch(/claude/);
  });

  it("Google AI should have gemini model as default", () => {
    const info = ProviderFactory.getProviderInfo(AIProviderName.GOOGLE_AI);
    expect(info?.defaultModel).toBeDefined();
    expect(info?.defaultModel).toMatch(/gemini/);
  });

  it("Mistral should have mistral model as default", () => {
    const info = ProviderFactory.getProviderInfo(AIProviderName.MISTRAL);
    expect(info?.defaultModel).toBeDefined();
    expect(info?.defaultModel).toMatch(/mistral/);
  });
});

describe("Provider Capabilities - Provider Count", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should have at least 13 core providers registered", () => {
    const coreProviders = [
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

    let registeredCount = 0;
    for (const provider of coreProviders) {
      if (ProviderFactory.hasProvider(provider)) {
        registeredCount++;
      }
    }

    expect(registeredCount).toBe(13);
  });

  it("should have at least 25 total entries (providers + aliases)", () => {
    const allProviders = ProviderFactory.getAvailableProviders();
    expect(allProviders.length).toBeGreaterThanOrEqual(25);
  });
});

describe("Provider Capabilities - Case Insensitivity", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  const caseVariants = [
    { input: "OPENAI", expected: true },
    { input: "openai", expected: true },
    { input: "OpenAI", expected: true },
    { input: "GPT", expected: true },
    { input: "gpt", expected: true },
    { input: "CLAUDE", expected: true },
    { input: "claude", expected: true },
    { input: "GEMINI", expected: true },
    { input: "gemini", expected: true },
    { input: "MISTRAL", expected: true },
    { input: "mistral", expected: true },
  ];

  for (const { input, expected } of caseVariants) {
    it(`should handle case variant "${input}"`, () => {
      expect(ProviderFactory.hasProvider(input)).toBe(expected);
    });
  }
});

describe("Provider Capabilities - Multimodal Providers", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should have multimodal-capable providers registered", () => {
    const multimodalProviders = [
      AIProviderName.OPENAI,
      AIProviderName.ANTHROPIC,
      AIProviderName.GOOGLE_AI,
      AIProviderName.VERTEX,
    ];

    for (const provider of multimodalProviders) {
      expect(ProviderFactory.hasProvider(provider)).toBe(true);
    }
  });
});

describe("Provider Capabilities - Cloud Providers", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should have cloud providers registered", () => {
    const cloudProviders = [
      AIProviderName.BEDROCK,
      AIProviderName.AZURE,
      AIProviderName.VERTEX,
      AIProviderName.SAGEMAKER,
    ];

    for (const provider of cloudProviders) {
      expect(ProviderFactory.hasProvider(provider)).toBe(true);
    }
  });
});

describe("Provider Capabilities - Local Providers", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should have local/self-hosted providers registered", () => {
    const localProviders = [
      AIProviderName.OLLAMA,
      AIProviderName.OPENAI_COMPATIBLE,
    ];

    for (const provider of localProviders) {
      expect(ProviderFactory.hasProvider(provider)).toBe(true);
    }
  });
});

describe("Provider Capabilities - Proxy Providers", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should have aggregator/proxy providers registered", () => {
    const proxyProviders = [AIProviderName.OPENROUTER, AIProviderName.LITELLM];

    for (const provider of proxyProviders) {
      expect(ProviderFactory.hasProvider(provider)).toBe(true);
    }
  });
});

describe("Provider Capabilities - Error Messages", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should throw error for unknown provider", async () => {
    await expect(
      ProviderFactory.createProvider("nonexistent-provider" as AIProviderName),
    ).rejects.toThrow();
  });

  it("should include available providers in error message", async () => {
    try {
      await ProviderFactory.createProvider("invalid" as AIProviderName);
      expect.fail("Should have thrown error");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("Unknown provider");
      expect(message).toContain("Available providers:");
    }
  });
});
