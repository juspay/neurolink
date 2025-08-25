import { describe, it, expect, vi } from "vitest";
import { MiddlewareFactory } from "../src/lib/middleware/factory.js";
import type { LanguageModelV1, LanguageModelV1Middleware } from "ai";
import type { NeuroLinkMiddleware } from "../src/lib/middleware/types.js";

// Define a type for our mock wrapped model
interface MockWrappedModel extends LanguageModelV1 {
  isWrapped: boolean;
  appliedMiddleware: LanguageModelV1Middleware[];
}

// Mock the AI SDK's wrapLanguageModel function
vi.mock("ai", async () => {
  const actual = await vi.importActual("ai");
  return {
    ...actual,
    wrapLanguageModel: vi.fn(({ model, middleware }) => {
      // Return a mock wrapped model
      return {
        ...model,
        isWrapped: true,
        appliedMiddleware: middleware,
      };
    }),
  };
});

describe("MiddlewareFactory Basic Integration", () => {
  it("should initialize with default preset (analytics)", () => {
    const factory = new MiddlewareFactory();
    const presets = factory.getAvailablePresets();
    const defaultPreset = presets.find((p) => p.name === "default");

    expect(defaultPreset).toBeDefined();
    expect(defaultPreset?.middleware).toContain("analytics");
  });

  it("should initialize with a specified preset (e.g., 'all')", () => {
    const factory = new MiddlewareFactory({ preset: "all" });
    const presets = factory.getAvailablePresets();
    const allPreset = presets.find((p) => p.name === "all");

    expect(allPreset).toBeDefined();
    expect(allPreset?.middleware).toContain("analytics");
    expect(allPreset?.middleware).toContain("guardrails");
  });

  it("should register and apply a custom middleware", () => {
    const customMiddleware: NeuroLinkMiddleware = {
      metadata: {
        id: "custom-logger",
        name: "Custom Logger",
        priority: 200,
      },
      wrapGenerate: async (args) => {
        console.log("Custom middleware executed!");
        return args.doGenerate();
      },
    };

    const factory = new MiddlewareFactory({
      middleware: [customMiddleware],
    });

    const mockModel: LanguageModelV1 = {
      provider: "mock-provider",
      modelId: "mock-model",
      doGenerate: vi.fn(),
      doStream: vi.fn(),
      specificationVersion: "v1",
      defaultObjectGenerationMode: "json",
    };

    const context = factory.createContext("test-provider", "test-model");
    const wrappedModel = factory.applyMiddleware(mockModel, context, {
      enabledMiddleware: ["custom-logger", "analytics"],
    }) as MockWrappedModel;

    expect(wrappedModel.isWrapped).toBe(true);
    const appliedIds = wrappedModel.appliedMiddleware.map(
      (m: LanguageModelV1Middleware) => (m as NeuroLinkMiddleware).metadata.id,
    );
    expect(appliedIds).toContain("custom-logger");
    expect(appliedIds).toContain("analytics");
  });

  it("should apply middleware and return a wrapped model", () => {
    const factory = new MiddlewareFactory({ preset: "all" });
    const mockModel: LanguageModelV1 = {
      provider: "mock-provider",
      modelId: "mock-model",
      doGenerate: vi.fn(),
      doStream: vi.fn(),
      specificationVersion: "v1",
      defaultObjectGenerationMode: "json",
    };

    const context = factory.createContext("test-provider", "test-model");
    const wrappedModel = factory.applyMiddleware(
      mockModel,
      context,
    ) as MockWrappedModel;

    expect(wrappedModel.isWrapped).toBe(true);
    expect(wrappedModel.appliedMiddleware.length).toBe(2); // analytics and guardrails
  });

  it("should correctly apply the default preset when no options are provided", () => {
    const factory = new MiddlewareFactory(); // No options
    const mockModel: LanguageModelV1 = {
      provider: "mock-provider",
      modelId: "mock-model",
      doGenerate: vi.fn(),
      doStream: vi.fn(),
      specificationVersion: "v1",
      defaultObjectGenerationMode: "json",
    };

    const context = factory.createContext("test-provider", "test-model");
    const wrappedModel = factory.applyMiddleware(
      mockModel,
      context,
    ) as MockWrappedModel;

    expect(wrappedModel.isWrapped).toBe(true);
    const appliedIds = wrappedModel.appliedMiddleware.map(
      (m: LanguageModelV1Middleware) => (m as NeuroLinkMiddleware).metadata.id,
    );
    expect(appliedIds).toEqual(["analytics"]);
  });

  it("should allow overriding a preset's configuration", () => {
    const factory = new MiddlewareFactory({
      preset: "all", // Enable analytics and guardrails
      middlewareConfig: {
        analytics: { enabled: false }, // But explicitly disable analytics
      },
    });

    const mockModel: LanguageModelV1 = {
      provider: "mock-provider",
      modelId: "mock-model",
      doGenerate: vi.fn(),
      doStream: vi.fn(),
      specificationVersion: "v1",
      defaultObjectGenerationMode: "json",
    };

    const context = factory.createContext("test-provider", "test-model");
    const wrappedModel = factory.applyMiddleware(
      mockModel,
      context,
    ) as MockWrappedModel;

    expect(wrappedModel.isWrapped).toBe(true);
    const appliedIds = wrappedModel.appliedMiddleware.map(
      (m: LanguageModelV1Middleware) => (m as NeuroLinkMiddleware).metadata.id,
    );
    expect(appliedIds).toContain("guardrails");
    expect(appliedIds).not.toContain("analytics");
    expect(wrappedModel.appliedMiddleware.length).toBe(1);
  });

  it("should handle only custom middleware without a preset", () => {
    const customMiddleware: NeuroLinkMiddleware = {
      metadata: { id: "custom-only", name: "Custom Only" },
      wrapGenerate: async (args) => args.doGenerate(),
    };

    const factory = new MiddlewareFactory({
      middleware: [customMiddleware],
      enabledMiddleware: ["custom-only"],
    });

    const mockModel: LanguageModelV1 = {
      provider: "mock-provider",
      modelId: "mock-model",
      doGenerate: vi.fn(),
      doStream: vi.fn(),
      specificationVersion: "v1",
      defaultObjectGenerationMode: "json",
    };

    const context = factory.createContext("test-provider", "test-model");
    const wrappedModel = factory.applyMiddleware(
      mockModel,
      context,
    ) as MockWrappedModel;

    expect(wrappedModel.isWrapped).toBe(true);
    const appliedIds = wrappedModel.appliedMiddleware.map(
      (m: LanguageModelV1Middleware) => (m as NeuroLinkMiddleware).metadata.id,
    );
    expect(appliedIds).toEqual(["custom-only"]);
    expect(wrappedModel.appliedMiddleware.length).toBe(1);
  });
});
