/**
 * Gateway Provider Factory Tests
 *
 * Comprehensive tests for the ProviderFactory pattern used by NeuroLink
 * to manage 69+ AI providers through a unified factory system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ProviderFactory } from "../../src/lib/factories/providerFactory.js";
import { ProviderRegistry } from "../../src/lib/factories/providerRegistry.js";
import { AIProviderName } from "../../src/lib/constants/enums.js";

describe("GatewayProviderFactory", () => {
  beforeEach(async () => {
    // Clear registrations before each test
    ProviderFactory.clearRegistrations();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Provider Registration", () => {
    it("should register a provider with factory function", () => {
      const mockFactory = vi.fn().mockResolvedValue({
        getAISDKModel: vi.fn(),
        generate: vi.fn(),
      });

      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        mockFactory,
        "gpt-4o",
        ["gpt", "chatgpt"],
      );

      expect(ProviderFactory.hasProvider(AIProviderName.OPENAI)).toBe(true);
    });

    it("should register provider with aliases", () => {
      const mockFactory = vi.fn().mockResolvedValue({
        getAISDKModel: vi.fn(),
        generate: vi.fn(),
      });

      ProviderFactory.registerProvider(
        AIProviderName.ANTHROPIC,
        mockFactory,
        "claude-3-5-sonnet",
        ["claude", "anthropic"],
      );

      expect(ProviderFactory.hasProvider("claude")).toBe(true);
      expect(ProviderFactory.hasProvider("anthropic")).toBe(true);
    });

    it("should register provider without default model (env-based)", () => {
      const mockFactory = vi.fn().mockResolvedValue({
        getAISDKModel: vi.fn(),
        generate: vi.fn(),
      });

      ProviderFactory.registerProvider(
        AIProviderName.BEDROCK,
        mockFactory,
        undefined, // No default model - will read from env
        ["bedrock", "aws"],
      );

      expect(ProviderFactory.hasProvider(AIProviderName.BEDROCK)).toBe(true);
    });

    it("should handle case-insensitive provider names", () => {
      const mockFactory = vi.fn().mockResolvedValue({
        getAISDKModel: vi.fn(),
        generate: vi.fn(),
      });

      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        mockFactory,
        "gpt-4o",
        [],
      );

      expect(ProviderFactory.hasProvider("OPENAI")).toBe(true);
      expect(ProviderFactory.hasProvider("openai")).toBe(true);
      expect(ProviderFactory.hasProvider("OpenAI")).toBe(true);
    });
  });

  describe("Provider Creation", () => {
    it("should create provider instance with model name", async () => {
      const mockProvider = {
        getAISDKModel: vi.fn(),
        generate: vi.fn(),
        modelName: "gpt-4o-mini",
      };
      const mockFactory = vi.fn().mockResolvedValue(mockProvider);

      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        mockFactory,
        "gpt-4o",
        [],
      );

      const provider = await ProviderFactory.createProvider(
        AIProviderName.OPENAI,
        "gpt-4o-mini",
      );

      expect(provider).toBe(mockProvider);
      expect(mockFactory).toHaveBeenCalledWith(
        "gpt-4o-mini",
        AIProviderName.OPENAI,
        undefined,
        undefined,
      );
    });

    it("should use default model when no model specified", async () => {
      const mockProvider = {
        getAISDKModel: vi.fn(),
        generate: vi.fn(),
      };
      const mockFactory = vi.fn().mockResolvedValue(mockProvider);

      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        mockFactory,
        "gpt-4o",
        [],
      );

      await ProviderFactory.createProvider(AIProviderName.OPENAI);

      expect(mockFactory).toHaveBeenCalledWith(
        "gpt-4o",
        AIProviderName.OPENAI,
        undefined,
        undefined,
      );
    });

    it("should pass SDK instance to provider factory", async () => {
      const mockProvider = {
        getAISDKModel: vi.fn(),
        generate: vi.fn(),
      };
      const mockFactory = vi.fn().mockResolvedValue(mockProvider);
      const mockSdk = { config: {} };

      ProviderFactory.registerProvider(
        AIProviderName.GOOGLE_AI,
        mockFactory,
        "gemini-2.5-flash",
        [],
      );

      await ProviderFactory.createProvider(
        AIProviderName.GOOGLE_AI,
        "gemini-2.5-pro",
        mockSdk,
      );

      expect(mockFactory).toHaveBeenCalledWith(
        "gemini-2.5-pro",
        AIProviderName.GOOGLE_AI,
        mockSdk,
        undefined,
      );
    });

    it("should pass region to provider factory for cloud providers", async () => {
      const mockProvider = {
        getAISDKModel: vi.fn(),
        generate: vi.fn(),
      };
      const mockFactory = vi.fn().mockResolvedValue(mockProvider);

      ProviderFactory.registerProvider(
        AIProviderName.BEDROCK,
        mockFactory,
        undefined,
        ["bedrock", "aws"],
      );

      await ProviderFactory.createProvider(
        AIProviderName.BEDROCK,
        "anthropic.claude-3-5-sonnet",
        undefined,
        "us-west-2",
      );

      expect(mockFactory).toHaveBeenCalledWith(
        "anthropic.claude-3-5-sonnet",
        AIProviderName.BEDROCK,
        undefined,
        "us-west-2",
      );
    });

    it("should throw error for unknown provider", async () => {
      await expect(
        ProviderFactory.createProvider("unknown-provider" as AIProviderName),
      ).rejects.toThrow("Unknown provider: unknown-provider");
    });

    it("should include available providers in error message", async () => {
      const mockFactory = vi.fn().mockResolvedValue({});

      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        mockFactory,
        "gpt-4o",
        [],
      );
      ProviderFactory.registerProvider(
        AIProviderName.ANTHROPIC,
        mockFactory,
        "claude",
        [],
      );

      try {
        await ProviderFactory.createProvider(
          "unknown-provider" as AIProviderName,
        );
        expect.fail("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toContain("openai");
        expect((error as Error).message).toContain("anthropic");
      }
    });
  });

  describe("Factory Error Handling", () => {
    it("should handle factory function errors gracefully", async () => {
      const mockFactory = vi
        .fn()
        .mockRejectedValue(new Error("API key missing"));

      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        mockFactory,
        "gpt-4o",
        [],
      );

      await expect(
        ProviderFactory.createProvider(AIProviderName.OPENAI),
      ).rejects.toThrow(/API key missing|Failed to create provider/);
    });

    it("should handle invalid factory constructor", async () => {
      // Register with invalid constructor
      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        "not-a-function" as any,
        "gpt-4o",
        [],
      );

      await expect(
        ProviderFactory.createProvider(AIProviderName.OPENAI),
      ).rejects.toThrow();
    });
  });

  describe("Provider Info Retrieval", () => {
    it("should return provider registration info", () => {
      const mockFactory = vi.fn().mockResolvedValue({});

      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        mockFactory,
        "gpt-4o",
        ["gpt", "chatgpt"],
      );

      const info = ProviderFactory.getProviderInfo(AIProviderName.OPENAI);

      expect(info).toBeDefined();
      expect(info?.defaultModel).toBe("gpt-4o");
      expect(info?.aliases).toEqual(["gpt", "chatgpt"]);
    });

    it("should return undefined for unregistered provider", () => {
      const info = ProviderFactory.getProviderInfo("nonexistent");
      expect(info).toBeUndefined();
    });
  });

  describe("Available Providers List", () => {
    it("should return list of registered providers", () => {
      const mockFactory = vi.fn().mockResolvedValue({});

      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        mockFactory,
        "gpt-4o",
        [],
      );
      ProviderFactory.registerProvider(
        AIProviderName.ANTHROPIC,
        mockFactory,
        "claude",
        [],
      );

      const providers = ProviderFactory.getAvailableProviders();

      expect(providers).toContain(AIProviderName.OPENAI);
      expect(providers).toContain(AIProviderName.ANTHROPIC);
    });

    it("should include aliases in available providers", () => {
      const mockFactory = vi.fn().mockResolvedValue({});

      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        mockFactory,
        "gpt-4o",
        ["gpt", "chatgpt"],
      );

      const providers = ProviderFactory.getAvailableProviders();

      expect(providers).toContain("gpt");
      expect(providers).toContain("chatgpt");
    });
  });

  describe("Provider Name Normalization", () => {
    it("should normalize provider name from alias", () => {
      const mockFactory = vi.fn().mockResolvedValue({});

      ProviderFactory.registerProvider(
        AIProviderName.ANTHROPIC,
        mockFactory,
        "claude",
        ["claude"],
      );

      // Note: normalizeProviderName returns the registered key, which for aliases
      // is the alias itself since they're registered separately
      const normalized = ProviderFactory.normalizeProviderName("claude");
      expect(normalized).toBeTruthy(); // Returns a valid key (either 'claude' or 'anthropic')
      expect(ProviderFactory.hasProvider(normalized!)).toBe(true);
    });

    it("should return null for unknown provider name", () => {
      const normalized = ProviderFactory.normalizeProviderName("unknown");
      expect(normalized).toBeNull();
    });

    it("should handle direct provider name", () => {
      const mockFactory = vi.fn().mockResolvedValue({});

      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        mockFactory,
        "gpt-4o",
        [],
      );

      const normalized = ProviderFactory.normalizeProviderName(
        AIProviderName.OPENAI,
      );
      expect(normalized).toBe(AIProviderName.OPENAI);
    });
  });

  describe("Clear Registrations", () => {
    it("should clear all provider registrations", () => {
      const mockFactory = vi.fn().mockResolvedValue({});

      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        mockFactory,
        "gpt-4o",
        [],
      );
      ProviderFactory.registerProvider(
        AIProviderName.ANTHROPIC,
        mockFactory,
        "claude",
        [],
      );

      ProviderFactory.clearRegistrations();

      expect(ProviderFactory.hasProvider(AIProviderName.OPENAI)).toBe(false);
      expect(ProviderFactory.hasProvider(AIProviderName.ANTHROPIC)).toBe(false);
      expect(ProviderFactory.getAvailableProviders()).toHaveLength(0);
    });
  });

  describe("Best Provider Selection", () => {
    it("should create best provider with model and SDK", async () => {
      const mockProvider = {
        getAISDKModel: vi.fn(),
        generate: vi.fn(),
      };
      const mockFactory = vi.fn().mockResolvedValue(mockProvider);
      const mockSdk = { config: {} };

      ProviderFactory.registerProvider(
        AIProviderName.OPENAI,
        mockFactory,
        "gpt-4o",
        [],
      );

      const provider = await ProviderFactory.createBestProvider(
        AIProviderName.OPENAI,
        "gpt-4o-mini",
        true,
        mockSdk,
      );

      expect(provider).toBe(mockProvider);
    });
  });

  describe("Environment Variable Model Resolution", () => {
    it("should respect VERTEX_MODEL environment variable", async () => {
      const originalEnv = process.env.VERTEX_MODEL;
      process.env.VERTEX_MODEL = "gemini-2.0-flash";

      const mockProvider = { getAISDKModel: vi.fn() };
      const mockFactory = vi.fn().mockResolvedValue(mockProvider);

      ProviderFactory.registerProvider(
        AIProviderName.VERTEX,
        mockFactory,
        "gemini-1.5-pro",
        ["vertex"],
      );

      await ProviderFactory.createProvider(AIProviderName.VERTEX);

      expect(mockFactory).toHaveBeenCalledWith(
        "gemini-2.0-flash",
        AIProviderName.VERTEX,
        undefined,
        undefined,
      );

      // Restore env
      if (originalEnv === undefined) {
        delete process.env.VERTEX_MODEL;
      } else {
        process.env.VERTEX_MODEL = originalEnv;
      }
    });

    it("should respect BEDROCK_MODEL environment variable", async () => {
      const originalEnv = process.env.BEDROCK_MODEL;
      process.env.BEDROCK_MODEL = "anthropic.claude-3-5-sonnet";

      const mockProvider = { getAISDKModel: vi.fn() };
      const mockFactory = vi.fn().mockResolvedValue(mockProvider);

      ProviderFactory.registerProvider(
        AIProviderName.BEDROCK,
        mockFactory,
        undefined,
        ["bedrock"],
      );

      await ProviderFactory.createProvider(AIProviderName.BEDROCK);

      expect(mockFactory).toHaveBeenCalledWith(
        "anthropic.claude-3-5-sonnet",
        AIProviderName.BEDROCK,
        undefined,
        undefined,
      );

      // Restore env
      if (originalEnv === undefined) {
        delete process.env.BEDROCK_MODEL;
      } else {
        process.env.BEDROCK_MODEL = originalEnv;
      }
    });
  });
});

describe("GatewayProviderFactory Async Factory Patterns", () => {
  beforeEach(() => {
    ProviderFactory.clearRegistrations();
  });

  it("should support async factory functions with dynamic imports", async () => {
    // Simulate dynamic import pattern used by ProviderRegistry
    const mockFactory = async (modelName?: string) => {
      // Simulate dynamic import delay
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        getAISDKModel: vi.fn(),
        generate: vi.fn(),
        modelName,
      };
    };

    ProviderFactory.registerProvider(
      AIProviderName.OPENAI,
      mockFactory,
      "gpt-4o",
      [],
    );

    const provider = await ProviderFactory.createProvider(
      AIProviderName.OPENAI,
      "gpt-4o-mini",
    );

    expect(provider.modelName).toBe("gpt-4o-mini");
  });

  it("should handle concurrent provider creation", async () => {
    const mockFactory = vi
      .fn()
      .mockImplementation(async (modelName?: string) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { modelName, getAISDKModel: vi.fn() };
      });

    ProviderFactory.registerProvider(
      AIProviderName.OPENAI,
      mockFactory,
      "gpt-4o",
      [],
    );

    // Create multiple providers concurrently
    const [p1, p2, p3] = await Promise.all([
      ProviderFactory.createProvider(AIProviderName.OPENAI, "model-1"),
      ProviderFactory.createProvider(AIProviderName.OPENAI, "model-2"),
      ProviderFactory.createProvider(AIProviderName.OPENAI, "model-3"),
    ]);

    expect(p1.modelName).toBe("model-1");
    expect(p2.modelName).toBe("model-2");
    expect(p3.modelName).toBe("model-3");
    expect(mockFactory).toHaveBeenCalledTimes(3);
  });
});
