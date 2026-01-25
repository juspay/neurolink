import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIProviderName } from "../../../src/lib/constants/enums.js";
import {
  getAllKnownProviders,
  getAuthEnvVar,
  getAvailableProviders,
  getDirectProviders,
  getGatewayProviders,
  getNeuroLinkProviderName,
  getProviderMapping,
  getRoutingDecision,
  getRoutingStrategy,
  hasDirectSupport,
  isLiteLLMConfigured,
  isOpenRouterConfigured,
  isProviderConfigured,
  shouldUseNeuroLinkProvider,
} from "../../../src/lib/gateway/providerMapper.js";

describe("providerMapper", () => {
  // Store original env values
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env for each test
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe("getProviderMapping", () => {
    it("should return mapping for known providers", () => {
      const openaiMapping = getProviderMapping("openai");
      expect(openaiMapping).toBeDefined();
      expect(openaiMapping?.id).toBe("openai");
      expect(openaiMapping?.name).toBe("OpenAI");
    });

    it("should return undefined for unknown providers", () => {
      expect(getProviderMapping("unknown-provider")).toBeUndefined();
    });

    it("should normalize provider name before lookup", () => {
      // GPT should map to openai
      const mapping = getProviderMapping("gpt");
      expect(mapping?.id).toBe("openai");
    });

    it("should handle case insensitivity", () => {
      const mapping = getProviderMapping("OpenAI");
      expect(mapping?.id).toBe("openai");
    });
  });

  describe("getRoutingStrategy", () => {
    it("should return direct for providers with direct support and configured API key", () => {
      process.env.OPENAI_API_KEY = "test-key";
      expect(getRoutingStrategy("openai")).toBe("direct");
    });

    it("should return openrouter for direct providers without API key", () => {
      delete process.env.OPENAI_API_KEY;
      expect(getRoutingStrategy("openai")).toBe("openrouter");
    });

    it("should return openrouter for gateway-only providers", () => {
      expect(getRoutingStrategy("groq")).toBe("openrouter");
      expect(getRoutingStrategy("deepseek")).toBe("openrouter");
    });

    it("should return openrouter for unknown providers", () => {
      expect(getRoutingStrategy("unknown-provider")).toBe("openrouter");
    });
  });

  describe("hasDirectSupport", () => {
    it("should return true for providers with direct SDK support", () => {
      expect(hasDirectSupport("openai")).toBe(true);
      expect(hasDirectSupport("anthropic")).toBe(true);
      expect(hasDirectSupport("google")).toBe(true);
      expect(hasDirectSupport("mistral")).toBe(true);
      expect(hasDirectSupport("vertex")).toBe(true);
      expect(hasDirectSupport("bedrock")).toBe(true);
      expect(hasDirectSupport("azure")).toBe(true);
      expect(hasDirectSupport("ollama")).toBe(true);
    });

    it("should return false for gateway-only providers", () => {
      expect(hasDirectSupport("groq")).toBe(false);
      expect(hasDirectSupport("deepseek")).toBe(false);
      expect(hasDirectSupport("together")).toBe(false);
      expect(hasDirectSupport("perplexity")).toBe(false);
      expect(hasDirectSupport("cohere")).toBe(false);
    });

    it("should return false for unknown providers", () => {
      expect(hasDirectSupport("unknown-provider")).toBe(false);
    });

    it("should handle provider aliases", () => {
      // GPT maps to openai which has direct support
      expect(hasDirectSupport("gpt")).toBe(true);
      // Claude maps to anthropic which has direct support
      expect(hasDirectSupport("claude")).toBe(true);
    });
  });

  describe("getAuthEnvVar", () => {
    it("should return correct env var for known providers", () => {
      expect(getAuthEnvVar("openai")).toBe("OPENAI_API_KEY");
      expect(getAuthEnvVar("anthropic")).toBe("ANTHROPIC_API_KEY");
      expect(getAuthEnvVar("google")).toBe("GOOGLE_AI_API_KEY");
      expect(getAuthEnvVar("mistral")).toBe("MISTRAL_API_KEY");
    });

    it("should return undefined for unknown providers", () => {
      expect(getAuthEnvVar("unknown-provider")).toBeUndefined();
    });
  });

  describe("isProviderConfigured", () => {
    it("should return true when API key is set", () => {
      process.env.OPENAI_API_KEY = "test-key";
      expect(isProviderConfigured("openai")).toBe(true);
    });

    it("should return false when API key is not set", () => {
      delete process.env.OPENAI_API_KEY;
      expect(isProviderConfigured("openai")).toBe(false);
    });

    it("should return false for empty API key", () => {
      process.env.OPENAI_API_KEY = "";
      expect(isProviderConfigured("openai")).toBe(false);
    });

    it("should return false for whitespace-only API key", () => {
      process.env.OPENAI_API_KEY = "   ";
      expect(isProviderConfigured("openai")).toBe(false);
    });

    it("should return true when Ollama HOST is set", () => {
      process.env.OLLAMA_HOST = "http://localhost:11434";
      expect(isProviderConfigured("ollama")).toBe(true);
    });
  });

  describe("isOpenRouterConfigured", () => {
    it("should return true when OPENROUTER_API_KEY is set", () => {
      process.env.OPENROUTER_API_KEY = "test-key";
      expect(isOpenRouterConfigured()).toBe(true);
    });

    it("should return false when OPENROUTER_API_KEY is not set", () => {
      delete process.env.OPENROUTER_API_KEY;
      expect(isOpenRouterConfigured()).toBe(false);
    });

    it("should return false for empty key", () => {
      process.env.OPENROUTER_API_KEY = "";
      expect(isOpenRouterConfigured()).toBe(false);
    });
  });

  describe("isLiteLLMConfigured", () => {
    it("should return true when LITELLM_BASE_URL is set", () => {
      process.env.LITELLM_BASE_URL = "http://localhost:4000";
      expect(isLiteLLMConfigured()).toBe(true);
    });

    it("should return true when LITELLM_API_KEY is set", () => {
      delete process.env.LITELLM_BASE_URL;
      process.env.LITELLM_API_KEY = "test-key";
      expect(isLiteLLMConfigured()).toBe(true);
    });

    it("should return false when neither is set", () => {
      delete process.env.LITELLM_BASE_URL;
      delete process.env.LITELLM_API_KEY;
      expect(isLiteLLMConfigured()).toBe(false);
    });
  });

  describe("getDirectProviders", () => {
    it("should return array of providers with direct support", () => {
      const providers = getDirectProviders();
      expect(providers).toContain("openai");
      expect(providers).toContain("anthropic");
      expect(providers).toContain("google");
      expect(providers).toContain("mistral");
      expect(providers).not.toContain("groq");
      expect(providers).not.toContain("deepseek");
    });
  });

  describe("getGatewayProviders", () => {
    it("should return array of gateway-only providers", () => {
      const providers = getGatewayProviders();
      expect(providers).toContain("groq");
      expect(providers).toContain("deepseek");
      expect(providers).toContain("together");
      expect(providers).toContain("perplexity");
      expect(providers).not.toContain("openai");
      expect(providers).not.toContain("anthropic");
    });
  });

  describe("getAllKnownProviders", () => {
    it("should return all known providers", () => {
      const providers = getAllKnownProviders();
      // Should include both direct and gateway providers
      expect(providers).toContain("openai");
      expect(providers).toContain("anthropic");
      expect(providers).toContain("groq");
      expect(providers).toContain("deepseek");
    });

    it("should return more than just direct providers", () => {
      const all = getAllKnownProviders();
      const direct = getDirectProviders();
      expect(all.length).toBeGreaterThan(direct.length);
    });
  });

  describe("getAvailableProviders", () => {
    it("should return only configured direct providers when no OpenRouter", () => {
      delete process.env.OPENROUTER_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";
      process.env.ANTHROPIC_API_KEY = "test-key";
      delete process.env.GOOGLE_AI_API_KEY;

      const available = getAvailableProviders();
      expect(available).toContain("openai");
      expect(available).toContain("anthropic");
      // Google not configured, so not available
      expect(available).not.toContain("google");
      // Gateway providers not available without OpenRouter
      expect(available).not.toContain("groq");
    });

    it("should include gateway providers when OpenRouter is configured", () => {
      process.env.OPENROUTER_API_KEY = "test-key";

      const available = getAvailableProviders();
      expect(available).toContain("groq");
      expect(available).toContain("deepseek");
    });
  });

  describe("getNeuroLinkProviderName", () => {
    it("should return NeuroLink provider name for direct providers", () => {
      expect(getNeuroLinkProviderName("openai")).toBe(AIProviderName.OPENAI);
      expect(getNeuroLinkProviderName("anthropic")).toBe(
        AIProviderName.ANTHROPIC,
      );
      expect(getNeuroLinkProviderName("google")).toBe(AIProviderName.GOOGLE_AI);
    });

    it("should return undefined for gateway-only providers", () => {
      expect(getNeuroLinkProviderName("groq")).toBeUndefined();
      expect(getNeuroLinkProviderName("deepseek")).toBeUndefined();
    });

    it("should return undefined for unknown providers", () => {
      expect(getNeuroLinkProviderName("unknown-provider")).toBeUndefined();
    });
  });

  describe("shouldUseNeuroLinkProvider", () => {
    it("should return true for configured direct providers", () => {
      process.env.OPENAI_API_KEY = "test-key";
      expect(shouldUseNeuroLinkProvider("openai")).toBe(true);
    });

    it("should return false for unconfigured direct providers", () => {
      delete process.env.OPENAI_API_KEY;
      expect(shouldUseNeuroLinkProvider("openai")).toBe(false);
    });

    it("should return false for gateway-only providers", () => {
      expect(shouldUseNeuroLinkProvider("groq")).toBe(false);
    });

    it("should return false for unknown providers", () => {
      expect(shouldUseNeuroLinkProvider("unknown-provider")).toBe(false);
    });
  });

  describe("getRoutingDecision", () => {
    it("should return complete routing decision", () => {
      process.env.OPENAI_API_KEY = "test-key";
      process.env.OPENROUTER_API_KEY = "router-key";

      const decision = getRoutingDecision("openai");

      expect(decision.provider).toBe("openai");
      expect(decision.strategy).toBe("direct");
      expect(decision.hasDirectSupport).toBe(true);
      expect(decision.isConfigured).toBe(true);
      expect(decision.neuroLinkProvider).toBe(AIProviderName.OPENAI);
      expect(decision.fallbackAvailable).toBe(true);
    });

    it("should indicate when fallback is not available", () => {
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const decision = getRoutingDecision("openai");

      expect(decision.fallbackAvailable).toBe(false);
      expect(decision.strategy).toBe("openrouter"); // Falls back even without key
    });

    it("should handle gateway-only providers", () => {
      process.env.OPENROUTER_API_KEY = "router-key";

      const decision = getRoutingDecision("groq");

      expect(decision.provider).toBe("groq");
      expect(decision.strategy).toBe("openrouter");
      expect(decision.hasDirectSupport).toBe(false);
      expect(decision.neuroLinkProvider).toBeUndefined();
    });

    it("should normalize provider name in decision", () => {
      const decision = getRoutingDecision("GPT");
      expect(decision.provider).toBe("openai");
    });
  });
});
