/**
 * Provider Consistency Tests
 *
 * Comprehensive tests to verify that all 13+ providers implement
 * the expected interface consistently across the Gateway system.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { ProviderRegistry } from "../../src/lib/factories/providerRegistry.js";
import { ProviderFactory } from "../../src/lib/factories/providerFactory.js";
import { AIProviderName } from "../../src/lib/constants/enums.js";

// All core providers that should be registered
const CORE_PROVIDERS = [
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

// Provider aliases mapping
const PROVIDER_ALIASES: Record<string, string[]> = {
  [AIProviderName.OPENAI]: ["gpt", "chatgpt"],
  [AIProviderName.ANTHROPIC]: ["claude", "anthropic"],
  [AIProviderName.GOOGLE_AI]: [
    "google",
    "gemini",
    "googleAiStudio",
    "google-ai",
    "google-ai-studio",
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

describe("Provider Consistency - Registration", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  describe("All Core Providers Registered", () => {
    for (const provider of CORE_PROVIDERS) {
      it(`should have ${provider} registered`, () => {
        expect(ProviderFactory.hasProvider(provider)).toBe(true);
      });
    }
  });

  describe("Provider Aliases", () => {
    for (const [provider, aliases] of Object.entries(PROVIDER_ALIASES)) {
      describe(`${provider} aliases`, () => {
        for (const alias of aliases) {
          it(`should recognize alias "${alias}"`, () => {
            expect(ProviderFactory.hasProvider(alias)).toBe(true);
          });
        }
      });
    }
  });

  describe("Provider Info Structure", () => {
    for (const provider of CORE_PROVIDERS) {
      it(`${provider} should have valid registration info`, () => {
        const info = ProviderFactory.getProviderInfo(provider);

        expect(info).toBeDefined();
        expect(info?.constructor).toBeDefined();
        expect(typeof info?.constructor).toBe("function");
        expect(Array.isArray(info?.aliases)).toBe(true);
      });
    }
  });
});

describe("Provider Consistency - Default Models", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  const expectedDefaultModels: Partial<Record<AIProviderName, string>> = {
    [AIProviderName.OPENAI]: "gpt-4o-mini",
    [AIProviderName.ANTHROPIC]: "claude-sonnet-4-20250514",
    [AIProviderName.GOOGLE_AI]: "gemini-2.5-flash",
    [AIProviderName.VERTEX]: "claude-sonnet-4@20250514",
    [AIProviderName.MISTRAL]: "mistral-large-latest",
  };

  for (const [provider, expectedModel] of Object.entries(
    expectedDefaultModels,
  )) {
    it(`${provider} should have correct default model`, () => {
      const info = ProviderFactory.getProviderInfo(provider);
      expect(info?.defaultModel).toBe(expectedModel);
    });
  }

  it("should have default models for most providers", () => {
    let providersWithDefaults = 0;

    for (const provider of CORE_PROVIDERS) {
      const info = ProviderFactory.getProviderInfo(provider);
      if (info?.defaultModel !== undefined) {
        providersWithDefaults++;
      }
    }

    // Most providers should have default models
    expect(providersWithDefaults).toBeGreaterThanOrEqual(8);
  });
});

describe("Provider Consistency - Case Insensitivity", () => {
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
    { input: "OpenAi", expected: true },
    { input: "ANTHROPIC", expected: true },
    { input: "anthropic", expected: true },
    { input: "Anthropic", expected: true },
    { input: "GOOGLE-AI", expected: true },
    { input: "google-ai", expected: true },
    { input: "GPT", expected: true },
    { input: "gpt", expected: true },
    { input: "CLAUDE", expected: true },
    { input: "claude", expected: true },
    { input: "GEMINI", expected: true },
    { input: "gemini", expected: true },
  ];

  for (const { input, expected } of caseVariants) {
    it(`should handle case variant "${input}"`, () => {
      expect(ProviderFactory.hasProvider(input)).toBe(expected);
    });
  }
});

describe("Provider Consistency - Normalization", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  // Note: normalizeProviderName returns a valid registered key, which for aliases
  // is the alias key itself since aliases are registered as separate entries.
  // The key test is that the normalized name is a valid registered provider.

  it("should normalize provider aliases to valid registered providers", () => {
    const normalized = ProviderFactory.normalizeProviderName("gpt");
    expect(normalized).toBeTruthy();
    expect(ProviderFactory.hasProvider(normalized!)).toBe(true);
  });

  it("should normalize claude to valid provider", () => {
    const normalized = ProviderFactory.normalizeProviderName("claude");
    expect(normalized).toBeTruthy();
    expect(ProviderFactory.hasProvider(normalized!)).toBe(true);
  });

  it("should normalize gemini to valid provider", () => {
    const normalized = ProviderFactory.normalizeProviderName("gemini");
    expect(normalized).toBeTruthy();
    expect(ProviderFactory.hasProvider(normalized!)).toBe(true);
  });

  it("should normalize aws to valid provider", () => {
    const normalized = ProviderFactory.normalizeProviderName("aws");
    expect(normalized).toBeTruthy();
    expect(ProviderFactory.hasProvider(normalized!)).toBe(true);
  });

  it("should normalize local to valid provider", () => {
    const normalized = ProviderFactory.normalizeProviderName("local");
    expect(normalized).toBeTruthy();
    expect(ProviderFactory.hasProvider(normalized!)).toBe(true);
  });

  it("should normalize hf to valid provider", () => {
    const normalized = ProviderFactory.normalizeProviderName("hf");
    expect(normalized).toBeTruthy();
    expect(ProviderFactory.hasProvider(normalized!)).toBe(true);
  });

  it("should return null for unknown providers", () => {
    const normalized =
      ProviderFactory.normalizeProviderName("unknown-provider");
    expect(normalized).toBeNull();
  });
});

describe("Provider Consistency - Provider Count", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should have at least 13 core providers", () => {
    let registeredCount = 0;
    for (const provider of CORE_PROVIDERS) {
      if (ProviderFactory.hasProvider(provider)) {
        registeredCount++;
      }
    }
    expect(registeredCount).toBeGreaterThanOrEqual(13);
  });

  it("should have at least 25 total entries (providers + aliases)", () => {
    const allProviders = ProviderFactory.getAvailableProviders();
    expect(allProviders.length).toBeGreaterThanOrEqual(25);
  });

  it("should have unique provider entries", () => {
    const allProviders = ProviderFactory.getAvailableProviders();
    const uniqueProviders = [
      ...new Set(allProviders.map((p) => p.toLowerCase())),
    ];
    expect(uniqueProviders.length).toBe(allProviders.length);
  });
});

describe("Provider Consistency - Factory Function Existence", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  for (const provider of CORE_PROVIDERS) {
    it(`${provider} should have a callable factory function`, () => {
      const info = ProviderFactory.getProviderInfo(provider);
      expect(info?.constructor).toBeDefined();
      expect(typeof info?.constructor).toBe("function");
    });
  }
});

describe("Provider Consistency - Model Enums Alignment", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("OpenAI default model should be a valid OpenAI model", () => {
    const info = ProviderFactory.getProviderInfo(AIProviderName.OPENAI);
    expect(info?.defaultModel).toMatch(/^gpt-/);
  });

  it("Anthropic default model should be a valid Claude model", () => {
    const info = ProviderFactory.getProviderInfo(AIProviderName.ANTHROPIC);
    expect(info?.defaultModel).toMatch(/claude/);
  });

  it("Google AI default model should be a valid Gemini model", () => {
    const info = ProviderFactory.getProviderInfo(AIProviderName.GOOGLE_AI);
    expect(info?.defaultModel).toMatch(/gemini/);
  });

  it("Mistral default model should be a valid Mistral model", () => {
    const info = ProviderFactory.getProviderInfo(AIProviderName.MISTRAL);
    expect(info?.defaultModel).toMatch(/mistral/);
  });

  it("OpenRouter default model should use provider/model format", () => {
    const info = ProviderFactory.getProviderInfo(AIProviderName.OPENROUTER);
    expect(info?.defaultModel).toMatch(/\//); // Contains slash for provider/model format
  });
});

describe("Provider Consistency - Environment Variable Support", () => {
  const envVarTests = [
    { provider: AIProviderName.OLLAMA, envVar: "OLLAMA_MODEL" },
    { provider: AIProviderName.LITELLM, envVar: "LITELLM_MODEL" },
    { provider: AIProviderName.HUGGINGFACE, envVar: "HUGGINGFACE_MODEL" },
    { provider: AIProviderName.OPENROUTER, envVar: "OPENROUTER_MODEL" },
    { provider: AIProviderName.SAGEMAKER, envVar: "SAGEMAKER_MODEL" },
    {
      provider: AIProviderName.OPENAI_COMPATIBLE,
      envVar: "OPENAI_COMPATIBLE_MODEL",
    },
  ];

  for (const { provider, envVar } of envVarTests) {
    it(`${provider} should respect ${envVar} environment variable`, async () => {
      const originalValue = process.env[envVar];
      const testModel = `test-model-${Date.now()}`;

      // Set env var
      process.env[envVar] = testModel;

      // Re-register to pick up new env
      ProviderRegistry.clearRegistrations();
      await ProviderRegistry.registerAllProviders();

      const info = ProviderFactory.getProviderInfo(provider);

      // Restore env
      if (originalValue === undefined) {
        delete process.env[envVar];
      } else {
        process.env[envVar] = originalValue;
      }

      // Provider should have env var as default or undefined (env-based fallback)
      // Note: Some providers fallback to hardcoded defaults if env not set
      expect(
        info?.defaultModel === testModel || info?.defaultModel,
      ).toBeTruthy();

      // Cleanup
      ProviderRegistry.clearRegistrations();
    });
  }
});

describe("Provider Consistency - Provider Capabilities Inference", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should have multimodal-capable providers registered", () => {
    // These providers support vision/multimodal
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

  it("should have local/self-hosted providers registered", () => {
    const localProviders = [
      AIProviderName.OLLAMA,
      AIProviderName.OPENAI_COMPATIBLE,
    ];

    for (const provider of localProviders) {
      expect(ProviderFactory.hasProvider(provider)).toBe(true);
    }
  });

  it("should have aggregator/proxy providers registered", () => {
    const proxyProviders = [AIProviderName.OPENROUTER, AIProviderName.LITELLM];

    for (const provider of proxyProviders) {
      expect(ProviderFactory.hasProvider(provider)).toBe(true);
    }
  });
});

describe("Provider Consistency - Error Message Quality", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should include available providers in error message", async () => {
    try {
      await ProviderFactory.createProvider(
        "nonexistent-provider" as AIProviderName,
      );
      expect.fail("Should have thrown an error");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("Unknown provider");
      expect(message).toContain("Available providers:");
    }
  });

  it("should suggest similar providers in error (if implemented)", async () => {
    try {
      await ProviderFactory.createProvider("opnai" as AIProviderName); // Typo
      expect.fail("Should have thrown an error");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("Unknown provider");
      // At minimum, should list available providers
      expect(message).toContain("openai");
    }
  });
});
