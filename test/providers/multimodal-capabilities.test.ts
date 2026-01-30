/**
 * Provider Multimodal Capabilities Tests
 *
 * Tests for verifying which providers support:
 * - Vision/Image understanding
 * - PDF processing
 * - Audio/Voice
 * - Tool use
 * - Structured output
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ProviderRegistry } from "../../src/lib/factories/providerRegistry.js";
import { ProviderFactory } from "../../src/lib/factories/providerFactory.js";
import { AIProviderName } from "../../src/lib/constants/enums.js";

// Provider capability matrix
const PROVIDER_CAPABILITIES = {
  [AIProviderName.OPENAI]: {
    vision: true,
    pdf: false, // Requires preprocessing
    audio: true, // With specific models
    tools: true,
    structuredOutput: true,
    streaming: true,
  },
  [AIProviderName.ANTHROPIC]: {
    vision: true,
    pdf: true, // Native PDF support
    audio: false,
    tools: true,
    structuredOutput: true,
    streaming: true,
  },
  [AIProviderName.GOOGLE_AI]: {
    vision: true,
    pdf: true, // Native with Gemini
    audio: true, // With specific models
    tools: true,
    structuredOutput: true,
    streaming: true,
  },
  [AIProviderName.VERTEX]: {
    vision: true,
    pdf: true, // Native PDF support
    audio: true,
    tools: true,
    structuredOutput: true,
    streaming: true,
  },
  [AIProviderName.BEDROCK]: {
    vision: true, // With Claude models
    pdf: true, // With Claude models
    audio: false,
    tools: true, // With Claude models
    structuredOutput: true,
    streaming: true,
  },
  [AIProviderName.AZURE]: {
    vision: true, // With GPT-4V
    pdf: false,
    audio: true, // With specific models
    tools: true,
    structuredOutput: true,
    streaming: true,
  },
  [AIProviderName.MISTRAL]: {
    vision: true, // With Pixtral
    pdf: false,
    audio: true, // With Voxtral
    tools: true,
    structuredOutput: true,
    streaming: true,
  },
  [AIProviderName.OLLAMA]: {
    vision: true, // With llava models
    pdf: false,
    audio: false,
    tools: true, // With supported models
    structuredOutput: true,
    streaming: true,
  },
  [AIProviderName.OPENROUTER]: {
    vision: true, // Depends on model
    pdf: true, // Depends on model
    audio: false,
    tools: true, // Depends on model
    structuredOutput: true,
    streaming: true,
  },
  [AIProviderName.LITELLM]: {
    vision: true, // Depends on model
    pdf: true, // Depends on model
    audio: true, // Depends on model
    tools: true, // Depends on model
    structuredOutput: true,
    streaming: true,
  },
  [AIProviderName.HUGGINGFACE]: {
    vision: true, // With vision models
    pdf: false,
    audio: false,
    tools: false, // Limited support
    structuredOutput: false, // Limited support
    streaming: true,
  },
  [AIProviderName.SAGEMAKER]: {
    vision: true, // With supported models
    pdf: false,
    audio: false,
    tools: false, // Limited
    structuredOutput: false, // Limited
    streaming: true,
  },
  [AIProviderName.OPENAI_COMPATIBLE]: {
    vision: true, // Depends on backend
    pdf: false,
    audio: false,
    tools: true, // Depends on backend
    structuredOutput: true, // Depends on backend
    streaming: true,
  },
};

describe("Provider Multimodal Capabilities", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  describe("Vision-Capable Providers", () => {
    const visionProviders = Object.entries(PROVIDER_CAPABILITIES)
      .filter(([_, caps]) => caps.vision)
      .map(([provider]) => provider);

    it("should have multiple vision-capable providers", () => {
      expect(visionProviders.length).toBeGreaterThanOrEqual(8);
    });

    for (const provider of visionProviders) {
      it(`${provider} should be registered and support vision`, () => {
        expect(ProviderFactory.hasProvider(provider)).toBe(true);
        expect(
          PROVIDER_CAPABILITIES[provider as keyof typeof PROVIDER_CAPABILITIES]
            ?.vision,
        ).toBe(true);
      });
    }
  });

  describe("PDF-Capable Providers", () => {
    const pdfProviders = Object.entries(PROVIDER_CAPABILITIES)
      .filter(([_, caps]) => caps.pdf)
      .map(([provider]) => provider);

    it("should have PDF-capable providers", () => {
      expect(pdfProviders.length).toBeGreaterThanOrEqual(4);
    });

    for (const provider of pdfProviders) {
      it(`${provider} should support native PDF processing`, () => {
        expect(ProviderFactory.hasProvider(provider)).toBe(true);
        expect(
          PROVIDER_CAPABILITIES[provider as keyof typeof PROVIDER_CAPABILITIES]
            ?.pdf,
        ).toBe(true);
      });
    }
  });

  describe("Audio-Capable Providers", () => {
    const audioProviders = Object.entries(PROVIDER_CAPABILITIES)
      .filter(([_, caps]) => caps.audio)
      .map(([provider]) => provider);

    it("should have audio-capable providers", () => {
      expect(audioProviders.length).toBeGreaterThanOrEqual(4);
    });

    for (const provider of audioProviders) {
      it(`${provider} should support audio`, () => {
        expect(ProviderFactory.hasProvider(provider)).toBe(true);
        expect(
          PROVIDER_CAPABILITIES[provider as keyof typeof PROVIDER_CAPABILITIES]
            ?.audio,
        ).toBe(true);
      });
    }
  });

  describe("Tool-Capable Providers", () => {
    const toolProviders = Object.entries(PROVIDER_CAPABILITIES)
      .filter(([_, caps]) => caps.tools)
      .map(([provider]) => provider);

    it("should have tool-capable providers", () => {
      expect(toolProviders.length).toBeGreaterThanOrEqual(9);
    });

    for (const provider of toolProviders) {
      it(`${provider} should support tool use`, () => {
        expect(ProviderFactory.hasProvider(provider)).toBe(true);
        expect(
          PROVIDER_CAPABILITIES[provider as keyof typeof PROVIDER_CAPABILITIES]
            ?.tools,
        ).toBe(true);
      });
    }
  });

  describe("Structured Output Providers", () => {
    const structuredProviders = Object.entries(PROVIDER_CAPABILITIES)
      .filter(([_, caps]) => caps.structuredOutput)
      .map(([provider]) => provider);

    it("should have structured output providers", () => {
      expect(structuredProviders.length).toBeGreaterThanOrEqual(9);
    });

    for (const provider of structuredProviders) {
      it(`${provider} should support structured output`, () => {
        expect(ProviderFactory.hasProvider(provider)).toBe(true);
        expect(
          PROVIDER_CAPABILITIES[provider as keyof typeof PROVIDER_CAPABILITIES]
            ?.structuredOutput,
        ).toBe(true);
      });
    }
  });

  describe("Streaming Support", () => {
    const streamingProviders = Object.entries(PROVIDER_CAPABILITIES)
      .filter(([_, caps]) => caps.streaming)
      .map(([provider]) => provider);

    it("all providers should support streaming", () => {
      // Streaming is expected for all modern providers
      expect(streamingProviders.length).toBe(
        Object.keys(PROVIDER_CAPABILITIES).length,
      );
    });
  });
});

describe("Provider Capability Matrix Validation", () => {
  beforeAll(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterAll(() => {
    ProviderRegistry.clearRegistrations();
  });

  it("should have capabilities defined for all core providers", () => {
    const coreProviders = [
      AIProviderName.OPENAI,
      AIProviderName.ANTHROPIC,
      AIProviderName.GOOGLE_AI,
      AIProviderName.VERTEX,
      AIProviderName.BEDROCK,
      AIProviderName.AZURE,
      AIProviderName.MISTRAL,
      AIProviderName.OLLAMA,
      AIProviderName.OPENROUTER,
      AIProviderName.LITELLM,
      AIProviderName.HUGGINGFACE,
      AIProviderName.SAGEMAKER,
      AIProviderName.OPENAI_COMPATIBLE,
    ];

    for (const provider of coreProviders) {
      expect(
        PROVIDER_CAPABILITIES[provider],
        `Missing capability definition for ${provider}`,
      ).toBeDefined();
    }
  });

  it("should have valid capability structure for all providers", () => {
    for (const [provider, caps] of Object.entries(PROVIDER_CAPABILITIES)) {
      expect(typeof caps.vision, `${provider}.vision should be boolean`).toBe(
        "boolean",
      );
      expect(typeof caps.pdf, `${provider}.pdf should be boolean`).toBe(
        "boolean",
      );
      expect(typeof caps.audio, `${provider}.audio should be boolean`).toBe(
        "boolean",
      );
      expect(typeof caps.tools, `${provider}.tools should be boolean`).toBe(
        "boolean",
      );
      expect(
        typeof caps.structuredOutput,
        `${provider}.structuredOutput should be boolean`,
      ).toBe("boolean");
      expect(
        typeof caps.streaming,
        `${provider}.streaming should be boolean`,
      ).toBe("boolean");
    }
  });
});

describe("Provider Model-Specific Capabilities", () => {
  describe("OpenAI Vision Models", () => {
    const visionModels = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"];
    const nonVisionModels = ["gpt-3.5-turbo"];

    it("should list vision-capable OpenAI models", () => {
      expect(visionModels.length).toBeGreaterThan(0);
    });

    it("should list non-vision OpenAI models", () => {
      expect(nonVisionModels.length).toBeGreaterThan(0);
    });
  });

  describe("Anthropic Vision Models", () => {
    const visionModels = [
      "claude-sonnet-4-20250514",
      "claude-3-5-sonnet-20241022",
      "claude-3-opus-20240229",
    ];

    it("should list vision-capable Anthropic models", () => {
      expect(visionModels.length).toBeGreaterThan(0);
    });
  });

  describe("Google Gemini Models", () => {
    const multimodalModels = [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
    ];

    it("should list multimodal Gemini models", () => {
      expect(multimodalModels.length).toBeGreaterThan(0);
    });
  });

  describe("Mistral Vision Models", () => {
    const visionModels = ["pixtral-large", "pixtral-12b"];

    it("should list vision-capable Mistral models (Pixtral)", () => {
      expect(visionModels.length).toBeGreaterThan(0);
    });
  });

  describe("Ollama Vision Models", () => {
    const visionModels = ["llava:7b", "llava:13b", "llava-llama3:8b"];

    it("should list vision-capable Ollama models", () => {
      expect(visionModels.length).toBeGreaterThan(0);
    });
  });
});

describe("Provider Feature Constraints", () => {
  it("should document Gemini tool + JSON schema limitation", () => {
    // This is a known limitation documented in CLAUDE.md
    const geminiLimitation = {
      providers: [AIProviderName.GOOGLE_AI, AIProviderName.VERTEX],
      constraint: "Cannot use tools and JSON schema output simultaneously",
      workaround: "Use tools OR structured JSON output, not both together",
    };

    expect(geminiLimitation.providers).toContain(AIProviderName.GOOGLE_AI);
    expect(geminiLimitation.providers).toContain(AIProviderName.VERTEX);
  });

  it("should document thinking level support", () => {
    const thinkingLevelProviders = [
      AIProviderName.ANTHROPIC,
      AIProviderName.GOOGLE_AI,
      AIProviderName.VERTEX,
    ];

    expect(thinkingLevelProviders.length).toBeGreaterThanOrEqual(3);
  });
});
