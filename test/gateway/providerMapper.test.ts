/**
 * Provider Mapper Tests
 *
 * Tests for mapping between gateway providers and NeuroLink providers
 *
 * @see src/lib/gateway/providerMapper.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getProviderMapping,
  getRoutingStrategy,
  hasDirectSupport,
  getAuthEnvVar,
  isProviderConfigured,
  isOpenRouterConfigured,
  getDirectProviders,
  getGatewayProviders,
  getAllKnownProviders,
  getAvailableProviders,
  getNeuroLinkProviderName,
  shouldUseNeuroLinkProvider,
  getRoutingDecision,
} from "../../src/lib/gateway/providerMapper.js";

describe("ProviderMapper", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("mapToNeuroLinkProvider", () => {
    it("should map openai to direct support", () => {
      const mapping = getProviderMapping("openai");
      expect(mapping).toBeDefined();
      expect(mapping?.neuroLinkProviderName).toBe("openai");
    });

    it("should map anthropic to direct support", () => {
      const mapping = getProviderMapping("anthropic");
      expect(mapping).toBeDefined();
      expect(mapping?.neuroLinkProviderName).toBe("anthropic");
    });

    it("should map google to direct support", () => {
      const mapping = getProviderMapping("google");
      expect(mapping).toBeDefined();
    });

    it("should map mistral to direct support", () => {
      const mapping = getProviderMapping("mistral");
      expect(mapping).toBeDefined();
    });

    it("should map cohere to gateway provider", () => {
      const mapping = getProviderMapping("cohere");
      expect(mapping).toBeDefined();
    });

    it("should handle unknown providers", () => {
      const mapping = getProviderMapping("unknown-provider-xyz");
      expect(mapping).toBeUndefined();
    });

    it("should be case-insensitive", () => {
      const lower = getProviderMapping("openai");
      const upper = getProviderMapping("OPENAI");
      const mixed = getProviderMapping("OpenAI");
      expect(lower).toBeDefined();
      expect(upper).toBeDefined();
      expect(mixed).toBeDefined();
    });
  });

  describe("mapFromNeuroLinkProvider", () => {
    it("should get NeuroLink provider name for openai", () => {
      const name = getNeuroLinkProviderName("openai");
      expect(name).toBe("openai");
    });

    it("should get NeuroLink provider name for anthropic", () => {
      const name = getNeuroLinkProviderName("anthropic");
      expect(name).toBe("anthropic");
    });

    it("should handle all supported providers", () => {
      const providers = getDirectProviders();
      expect(providers.length).toBeGreaterThan(0);
      for (const provider of providers) {
        const name = getNeuroLinkProviderName(provider);
        expect(name).toBeDefined();
      }
    });
  });

  describe("getDirectProviders", () => {
    it("should return list of directly supported providers", () => {
      const direct = getDirectProviders();
      expect(Array.isArray(direct)).toBe(true);
      expect(direct.length).toBeGreaterThan(0);
    });

    it("should include openai, anthropic, google, mistral", () => {
      const direct = getDirectProviders();
      expect(direct).toContain("openai");
      expect(direct).toContain("anthropic");
      expect(direct).toContain("google");
      expect(direct).toContain("mistral");
    });
  });

  describe("getGatewayOnlyProviders", () => {
    it("should return providers only available via gateway", () => {
      const gateway = getGatewayProviders();
      expect(Array.isArray(gateway)).toBe(true);
    });
  });

  describe("supportsDirectRouting", () => {
    it("should return true for direct providers with API keys", () => {
      process.env.OPENAI_API_KEY = "test-key";
      expect(hasDirectSupport("openai")).toBe(true);
      expect(isProviderConfigured("openai")).toBe(true);
    });

    it("should return false for providers without API keys", () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(isProviderConfigured("anthropic")).toBe(false);
    });

    it("should return false for gateway-only providers", () => {
      const gatewayProviders = getGatewayProviders();
      for (const provider of gatewayProviders) {
        expect(hasDirectSupport(provider)).toBe(false);
      }
    });
  });

  describe("getProviderApiKeyEnvVar", () => {
    it("should return correct env var for each provider", () => {
      expect(getAuthEnvVar("openai")).toBe("OPENAI_API_KEY");
      expect(getAuthEnvVar("anthropic")).toBe("ANTHROPIC_API_KEY");
      expect(getAuthEnvVar("google")).toBeDefined();
    });

    it("should handle provider aliases", () => {
      const openaiVar = getAuthEnvVar("gpt");
      expect(openaiVar).toBe("OPENAI_API_KEY");
    });
  });

  describe("normalizeProviderName", () => {
    it("should normalize common variations", () => {
      const decision1 = getRoutingDecision("openai");
      const decision2 = getRoutingDecision("OPENAI");
      expect(decision1.provider).toBe(decision2.provider);
    });

    it("should handle google variations (google, google-ai, gemini)", () => {
      const g1 = getRoutingDecision("google");
      const g2 = getRoutingDecision("google-ai");
      const g3 = getRoutingDecision("gemini");
      expect(g1.provider).toBe("google");
      expect(g2.provider).toBe("google");
      expect(g3.provider).toBe("google");
    });

    it("should handle anthropic variations (anthropic, claude)", () => {
      const a1 = getRoutingDecision("anthropic");
      const a2 = getRoutingDecision("claude");
      expect(a1.provider).toBe("anthropic");
      expect(a2.provider).toBe("anthropic");
    });

    it("should handle openai variations (openai, gpt, chatgpt)", () => {
      const o1 = getRoutingDecision("openai");
      const o2 = getRoutingDecision("gpt");
      const o3 = getRoutingDecision("chatgpt");
      expect(o1.provider).toBe("openai");
      expect(o2.provider).toBe("openai");
      expect(o3.provider).toBe("openai");
    });
  });
});
