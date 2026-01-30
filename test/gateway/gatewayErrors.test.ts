/**
 * Gateway Errors Tests
 *
 * Tests for gateway-specific error types and handling
 *
 * @see src/lib/gateway/errors.ts
 */

import { describe, it, expect } from "vitest";
import {
  GatewayError,
  ModelNotFoundError,
  RoutingError,
  RegistryFetchError,
  FallbackExhaustedError,
  ConfigurationError,
  GatewayDisabledError,
  MissingApiKeyError,
  GATEWAY_ERROR_CODES,
} from "../../src/lib/gateway/errors.js";

describe("Gateway Errors", () => {
  describe("GatewayError", () => {
    it("should create error with message", () => {
      const error = new GatewayError("Test error");
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("GatewayError");
    });

    it("should include gateway context", () => {
      const error = new GatewayError("Test error", {
        modelString: "openai/gpt-4",
        provider: "openai",
        context: { foo: "bar" },
      });
      expect(error.modelString).toBe("openai/gpt-4");
      expect(error.provider).toBe("openai");
      expect(error.context).toEqual({ foo: "bar" });
    });

    it("should preserve stack trace", () => {
      const originalError = new Error("Original");
      const error = new GatewayError("Wrapped", { originalError });
      expect(error.stack).toContain("Wrapped");
      expect(error.stack).toContain("Caused by:");
    });

    it("should be instanceof Error", () => {
      const error = new GatewayError("Test");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(GatewayError);
    });
  });

  describe("ModelNotFoundError", () => {
    it("should create error with model ID", () => {
      const error = new ModelNotFoundError("unknown-model");
      expect(error.message).toContain("unknown-model");
      expect(error.modelString).toBe("unknown-model");
      expect(error.code).toBe(GATEWAY_ERROR_CODES.MODEL_NOT_FOUND);
    });

    it("should include suggested models", () => {
      const error = new ModelNotFoundError("gpt4", {
        suggestions: ["gpt-4", "gpt-4o", "gpt-4-turbo"],
      });
      expect(error.message).toContain("Did you mean:");
      expect(error.message).toContain("gpt-4");
      expect(error.context?.suggestions).toEqual([
        "gpt-4",
        "gpt-4o",
        "gpt-4-turbo",
      ]);
    });

    it("should format helpful error message", () => {
      const error = new ModelNotFoundError("test-model", {
        suggestions: ["test-model-1", "test-model-2"],
      });
      expect(error.message).toContain('Model not found: "test-model"');
      expect(error.message).toContain("Did you mean:");
    });
  });

  describe("ProviderNotAvailableError (MissingApiKeyError)", () => {
    it("should create error with provider name", () => {
      const error = new MissingApiKeyError("openai", "OPENAI_API_KEY");
      expect(error.message).toContain("openai");
      expect(error.provider).toBe("openai");
      expect(error.code).toBe(GATEWAY_ERROR_CODES.MISSING_API_KEY);
    });

    it("should indicate if API key missing", () => {
      const error = new MissingApiKeyError("openai", "OPENAI_API_KEY");
      expect(error.message).toContain("API key required");
      expect(error.context?.envVar).toBe("OPENAI_API_KEY");
    });

    it("should suggest configuration steps", () => {
      const error = new MissingApiKeyError("anthropic", "ANTHROPIC_API_KEY");
      expect(error.message).toContain("Set ANTHROPIC_API_KEY");
    });
  });

  describe("RoutingError", () => {
    it("should create error for routing failures", () => {
      const error = new RoutingError("Routing failed");
      expect(error.message).toBe("Routing failed");
      expect(error.code).toBe(GATEWAY_ERROR_CODES.ROUTING_ERROR);
      expect(error.retriable).toBe(true);
    });

    it("should include attempted routes", () => {
      const error = new RoutingError("Failed", {
        modelString: "openai/gpt-4",
        provider: "openai",
        strategy: "direct",
      });
      expect(error.modelString).toBe("openai/gpt-4");
      expect(error.provider).toBe("openai");
      expect(error.context?.strategy).toBe("direct");
    });

    it("should include underlying errors", () => {
      const originalError = new Error("Network timeout");
      const error = new RoutingError("Failed", { originalError });
      expect(error.originalError).toBe(originalError);
    });
  });

  describe("RegistryFetchError", () => {
    it("should create error for fetch failures", () => {
      const error = new RegistryFetchError("Failed to fetch");
      expect(error.message).toBe("Failed to fetch");
      expect(error.code).toBe(GATEWAY_ERROR_CODES.REGISTRY_FETCH_ERROR);
      expect(error.retriable).toBe(true);
    });

    it("should include source information", () => {
      const error = new RegistryFetchError("Failed", {
        source: "models.dev",
        url: "https://models.dev/api/models",
        statusCode: 500,
      });
      expect(error.context?.source).toBe("models.dev");
      expect(error.context?.url).toBe("https://models.dev/api/models");
      expect(error.context?.statusCode).toBe(500);
    });

    it("should handle network errors", () => {
      const networkError = new Error("ECONNREFUSED");
      const error = new RegistryFetchError("Connection failed", {
        originalError: networkError,
      });
      expect(error.originalError).toBe(networkError);
    });
  });

  describe("FallbackExhaustedError", () => {
    it("should create error when all fallbacks fail", () => {
      const error = new FallbackExhaustedError(
        ["gpt-4", "gpt-3.5-turbo"],
        [new Error("Failed 1"), new Error("Failed 2")],
      );
      expect(error.code).toBe(GATEWAY_ERROR_CODES.FALLBACK_EXHAUSTED);
      expect(error.retriable).toBe(false);
    });

    it("should include all attempted models", () => {
      const error = new FallbackExhaustedError(
        ["model-1", "model-2", "model-3"],
        [new Error("E1"), new Error("E2"), new Error("E3")],
      );
      expect(error.attemptedModels).toEqual(["model-1", "model-2", "model-3"]);
      expect(error.message).toContain("model-1, model-2, model-3");
    });

    it("should include all errors", () => {
      const errors = [
        new Error("Error 1"),
        new Error("Error 2"),
        new Error("Error 3"),
      ];
      const error = new FallbackExhaustedError(
        ["m1", "m2", "m3"],
        errors,
      );
      expect(error.errors).toEqual(errors);
      expect(error.context?.errorCount).toBe(3);
    });

    it("should format comprehensive error message", () => {
      const error = new FallbackExhaustedError(
        ["gpt-4", "claude-3"],
        [new Error("Rate limit"), new Error("Timeout")],
      );
      expect(error.message).toContain("All fallback models exhausted");
      expect(error.message).toContain("gpt-4, claude-3");
      expect(error.message).toContain("Last error: Timeout");
    });
  });

  describe("error utilities", () => {
    it("should identify gateway errors", () => {
      const gatewayError = new GatewayError("Test");
      const regularError = new Error("Test");

      expect(gatewayError).toBeInstanceOf(GatewayError);
      expect(regularError).not.toBeInstanceOf(GatewayError);
    });

    it("should wrap non-gateway errors", () => {
      const originalError = new Error("Original");
      const wrapped = new GatewayError("Wrapped", { originalError });

      expect(wrapped).toBeInstanceOf(GatewayError);
      expect(wrapped.originalError).toBe(originalError);
    });

    it("should extract original error from wrapped", () => {
      const original = new Error("Original");
      const wrapped = new GatewayError("Wrapped", { originalError: original });

      expect(wrapped.originalError).toBe(original);
      expect(wrapped.originalError?.message).toBe("Original");
    });
  });
});
