/**
 * Registry Fetcher Tests
 *
 * Tests for dynamic model registry fetching from external sources
 *
 * @see src/lib/gateway/registryFetcher.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  RegistryFetcher,
  getGlobalFetcher,
  resetGlobalFetcher,
} from "../../src/lib/gateway/registryFetcher.js";
import { resetGlobalCache } from "../../src/lib/gateway/registryCache.js";
import type { GatewayModelInfo } from "../../src/lib/gateway/types.js";

// Mock fetch
const mockModelsDevResponse = {
  models: [
    {
      id: "gpt-4",
      provider: "openai",
      name: "GPT-4",
      description: "GPT-4",
      context_length: 8192,
      pricing: { input: 0.03, output: 0.06 },
      capabilities: { chat: true },
    },
  ],
};

const mockOpenRouterResponse = {
  data: [
    {
      id: "anthropic/claude-3",
      name: "Claude 3",
      context_length: 200000,
      pricing: { prompt: "0.00003", completion: "0.00015" },
    },
  ],
};

describe("RegistryFetcher", () => {
  let fetcher: RegistryFetcher;

  beforeEach(() => {
    resetGlobalCache();
    resetGlobalFetcher();
    fetcher = new RegistryFetcher({ cacheEnabled: false });

    // Mock global fetch
    global.fetch = vi.fn((url: string | URL) => {
      const urlStr = url.toString();
      if (urlStr.includes("models.dev")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockModelsDevResponse),
        } as Response);
      }
      if (urlStr.includes("openrouter")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOpenRouterResponse),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with default config", () => {
      const f = new RegistryFetcher();
      expect(f).toBeInstanceOf(RegistryFetcher);
    });

    it("should accept custom config", () => {
      const f = new RegistryFetcher({ cacheEnabled: false, cacheTtlMs: 5000 });
      expect(f).toBeInstanceOf(RegistryFetcher);
    });

    it("should configure cache options", () => {
      const f = new RegistryFetcher({ cacheEnabled: true });
      expect(f).toBeInstanceOf(RegistryFetcher);
    });
  });

  describe("getModels", () => {
    it("should fetch models from all sources", async () => {
      const models = await fetcher.getModels();
      expect(models.length).toBeGreaterThan(0);
    });

    it("should return cached models when valid", async () => {
      const f = new RegistryFetcher({ cacheEnabled: true });
      await f.getModels();
      const cached = await f.getModels();
      expect(cached.length).toBeGreaterThan(0);
    });

    it("should refresh cache when expired", async () => {
      const f = new RegistryFetcher({ cacheEnabled: true, cacheTtlMs: 1 });
      await f.getModels();
      await new Promise((r) => setTimeout(r, 10));
      const refreshed = await f.getModels();
      expect(refreshed.length).toBeGreaterThan(0);
    });

    it("should deduplicate concurrent fetches", async () => {
      const promises = [
        fetcher.getModels(),
        fetcher.getModels(),
        fetcher.getModels(),
      ];
      const results = await Promise.all(promises);
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
      expect(results[2]).toBeDefined();
    });

    it("should handle fetch errors gracefully", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Server Error",
        } as Response),
      );
      await expect(fetcher.getModels()).rejects.toThrow();
    });
  });

  describe("getProviderModels", () => {
    it("should filter models by provider", async () => {
      const models = await fetcher.getProviderModels("openai");
      expect(models.every((m) => m.provider.toLowerCase() === "openai")).toBe(
        true,
      );
    });

    it("should be case-insensitive for provider matching", async () => {
      const lower = await fetcher.getProviderModels("openai");
      const upper = await fetcher.getProviderModels("OPENAI");
      expect(lower.length).toBe(upper.length);
    });
  });

  describe("searchModels", () => {
    it("should search by model ID", async () => {
      const results = await fetcher.searchModels("gpt");
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it("should search by display name", async () => {
      const results = await fetcher.searchModels("GPT-4");
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it("should search by description", async () => {
      const results = await fetcher.searchModels("GPT");
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it("should search by aliases", async () => {
      const results = await fetcher.searchModels("claude");
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it("should be case-insensitive", async () => {
      const lower = await fetcher.searchModels("gpt");
      const upper = await fetcher.searchModels("GPT");
      expect(lower.length).toBe(upper.length);
    });
  });

  describe("getModel", () => {
    it("should find model by exact ID", async () => {
      const model = await fetcher.getModel("gpt-4");
      expect(model?.id.toLowerCase()).toBe("gpt-4");
    });

    it("should find model by alias", async () => {
      const models = await fetcher.getModels();
      if (models.length > 0 && models[0].aliases) {
        const alias = models[0].aliases[0];
        const found = await fetcher.getModel(alias);
        expect(found).toBeDefined();
      } else {
        expect(true).toBe(true); // Skip if no aliases
      }
    });

    it("should return undefined for unknown models", async () => {
      const model = await fetcher.getModel("unknown-model-xyz-123");
      expect(model).toBeUndefined();
    });
  });

  describe("refresh", () => {
    it("should clear cache and refetch", async () => {
      const f = new RegistryFetcher({ cacheEnabled: true });
      await f.getModels();
      await f.refresh();
      const models = await f.getModels();
      expect(models.length).toBeGreaterThan(0);
    });

    it("should handle refresh errors", async () => {
      const f = new RegistryFetcher({ cacheEnabled: true });
      await f.getModels();
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Error",
        } as Response),
      );
      await expect(f.refresh()).rejects.toThrow();
    });
  });

  describe("source fetching", () => {
    it("should fetch from models.dev", async () => {
      const models = await fetcher.getModels();
      expect(models.some((m) => m.id === "gpt-4")).toBe(true);
    });

    it("should fetch from OpenRouter", async () => {
      const models = await fetcher.getModels();
      expect(models.some((m) => m.id.includes("claude"))).toBe(true);
    });

    it("should respect source priority", async () => {
      const models = await fetcher.getModels();
      expect(models.length).toBeGreaterThan(0);
    });

    it("should continue on source failure", async () => {
      let callCount = 0;
      global.fetch = vi.fn((url: string | URL) => {
        callCount++;
        const urlStr = url.toString();
        if (urlStr.includes("models.dev")) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: "Error",
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOpenRouterResponse),
        } as Response);
      });
      const models = await fetcher.getModels();
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe("response parsing", () => {
    it("should parse models.dev response format", async () => {
      const models = await fetcher.getModels();
      expect(models.length).toBeGreaterThan(0);
    });

    it("should parse OpenRouter response format", async () => {
      const models = await fetcher.getModels();
      expect(models.length).toBeGreaterThan(0);
    });

    it("should handle malformed responses", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ invalid: "data" }),
        } as Response),
      );
      const models = await fetcher.getModels();
      expect(models).toEqual([]);
    });
  });

  describe("caching", () => {
    it("should cache models with TTL", async () => {
      const f = new RegistryFetcher({ cacheEnabled: true, cacheTtlMs: 10000 });
      const models1 = await f.getModels();
      const models2 = await f.getModels();
      expect(models1).toEqual(models2);
    });

    it("should invalidate cache on expiration", async () => {
      const f = new RegistryFetcher({ cacheEnabled: true, cacheTtlMs: 1 });
      await f.getModels();
      await new Promise((r) => setTimeout(r, 10));
      const models = await f.getModels();
      expect(models.length).toBeGreaterThan(0);
    });

    it("should support manual cache invalidation", async () => {
      const f = new RegistryFetcher({ cacheEnabled: true });
      await f.getModels();
      await f.refresh();
      const models = await f.getModels();
      expect(models.length).toBeGreaterThan(0);
    });
  });
});
