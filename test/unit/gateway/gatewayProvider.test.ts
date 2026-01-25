import type { LanguageModelV1 } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock constants to enable gateway by default
vi.mock("../../../src/lib/gateway/constants.js", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../../src/lib/gateway/constants.js")
    >();
  return {
    ...actual,
    GATEWAY_ENABLED: true,
  };
});

// Store original env
const originalEnv = process.env.NEUROLINK_GATEWAY_ENABLED;

// Create mock model
const createMockModel = (modelId: string): LanguageModelV1 =>
  ({
    modelId,
    provider: "openai",
    specificationVersion: "v1",
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  }) as unknown as LanguageModelV1;

// Create controllable mock functions
const mockCreateModel = vi
  .fn()
  .mockResolvedValue(createMockModel("openai/gpt-4o"));
const mockGetAvailableModels = vi
  .fn()
  .mockResolvedValue([
    "openai/gpt-4o",
    "anthropic/claude-3-5-sonnet",
    "google/gemini-2.0-flash",
  ]);
const mockGetModelInfo = vi.fn().mockResolvedValue({
  id: "openai/gpt-4o",
  provider: "openai",
  modelName: "gpt-4o",
  displayName: "GPT-4o",
  capabilities: {
    chat: true,
    completion: true,
    embedding: false,
    imageInput: true,
    imageOutput: false,
    audioInput: true,
    audioOutput: true,
    videoInput: false,
    videoOutput: false,
    functionCalling: true,
    jsonMode: true,
    streaming: true,
  },
});
const mockSearchModels = vi.fn().mockResolvedValue([]);
const mockCreateModelWithFallback = vi
  .fn()
  .mockResolvedValue(createMockModel("openai/gpt-4o"));

// Mock dependencies BEFORE any imports
vi.mock("../../../src/lib/gateway/modelRouter.js", () => ({
  getGlobalRouter: () => ({
    createModel: mockCreateModel,
    getAvailableModels: mockGetAvailableModels,
    getModelInfo: mockGetModelInfo,
    searchModels: mockSearchModels,
  }),
  resetGlobalRouter: vi.fn(),
  ModelRouter: vi.fn(),
}));

vi.mock("../../../src/lib/gateway/fallbackManager.js", () => ({
  getGlobalFallbackManager: () => ({
    createModelWithFallback: mockCreateModelWithFallback,
    executeWithFallback: vi.fn(),
  }),
  FallbackManager: vi.fn(),
}));

vi.mock("../../../src/lib/core/baseProvider.js", () => ({
  BaseProvider: class MockBaseProvider {
    protected modelName: string;
    protected providerName: string;
    protected neurolink: unknown;

    constructor(modelName: string, _providerName: string, sdk?: unknown) {
      this.modelName = modelName;
      this.providerName = "gateway";
      this.neurolink = sdk;
    }

    protected getTimeout() {
      return 30000;
    }

    protected supportsTools() {
      return true;
    }

    protected async getAllTools() {
      return {};
    }

    protected async buildMessagesForStream() {
      return [];
    }

    protected validateStreamOptions() {
      return;
    }

    protected createTextStream() {
      return new ReadableStream();
    }
  },
}));

vi.mock("../../../src/lib/utils/timeout.js", () => ({
  createTimeoutController: vi.fn().mockReturnValue({
    controller: { signal: new AbortController().signal },
    cleanup: vi.fn(),
  }),
}));

vi.mock("ai", () => ({
  streamText: vi.fn().mockResolvedValue({
    textStream: new ReadableStream(),
    toolCalls: [],
    toolResults: [],
  }),
}));

describe("GatewayProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Enable gateway for tests
    process.env.NEUROLINK_GATEWAY_ENABLED = "true";

    // Reset mock implementations
    mockCreateModel.mockResolvedValue(createMockModel("openai/gpt-4o"));
    mockGetAvailableModels.mockResolvedValue([
      "openai/gpt-4o",
      "anthropic/claude-3-5-sonnet",
      "google/gemini-2.0-flash",
    ]);
    mockGetModelInfo.mockResolvedValue({
      id: "openai/gpt-4o",
      provider: "openai",
      modelName: "gpt-4o",
      displayName: "GPT-4o",
      capabilities: {
        chat: true,
        completion: true,
        embedding: false,
        imageInput: true,
        imageOutput: false,
        audioInput: true,
        audioOutput: true,
        videoInput: false,
        videoOutput: false,
        functionCalling: true,
        jsonMode: true,
        streaming: true,
      },
    });
    mockSearchModels.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original env
    if (originalEnv === undefined) {
      delete process.env.NEUROLINK_GATEWAY_ENABLED;
    } else {
      process.env.NEUROLINK_GATEWAY_ENABLED = originalEnv;
    }
  });

  describe("constructor", () => {
    it("should create provider with model string", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o");
      expect(provider).toBeDefined();
    });

    it("should create provider with dynamic selector", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const selector = ({ availableModels }: { availableModels: string[] }) =>
        availableModels.includes("openai/gpt-4o")
          ? "openai/gpt-4o"
          : "openai/gpt-4o-mini";

      const provider = new GatewayProvider(selector);
      expect(provider).toBeDefined();
      expect(provider.hasDynamicSelector()).toBe(true);
    });

    it("should accept fallback configuration", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o", undefined, {
        fallback: {
          models: ["anthropic/claude-3-5-sonnet"],
          retries: 2,
          retryDelayMs: 1000,
        },
      });

      expect(provider).toBeDefined();
      expect(provider.hasFallback()).toBe(true);
    });

    // Note: "should throw when gateway is disabled" test is in a separate describe block
    // because it requires a complete module reset with different constant values
  });

  describe("getModelString", () => {
    it("should return the model string", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o");
      expect(provider.getModelString()).toBe("openai/gpt-4o");
    });
  });

  describe("getParsedProvider", () => {
    it("should return the parsed provider name", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o");
      expect(provider.getParsedProvider()).toBe("openai");
    });

    it("should normalize provider aliases", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("gemini/gemini-2.0-flash");
      expect(provider.getParsedProvider()).toBe("google");
    });
  });

  describe("getParsedModelName", () => {
    it("should return the model name without provider prefix", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o");
      expect(provider.getParsedModelName()).toBe("gpt-4o");
    });
  });

  describe("hasDynamicSelector", () => {
    it("should return false for static model string", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o");
      expect(provider.hasDynamicSelector()).toBe(false);
    });

    it("should return true for dynamic selector", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider(() => "openai/gpt-4o");
      expect(provider.hasDynamicSelector()).toBe(true);
    });
  });

  describe("hasFallback", () => {
    it("should return false when no fallback configured", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o");
      expect(provider.hasFallback()).toBe(false);
    });

    it("should return true when fallback models configured", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o", undefined, {
        fallback: {
          models: ["anthropic/claude-3-5-sonnet"],
          retries: 2,
          retryDelayMs: 1000,
        },
      });
      expect(provider.hasFallback()).toBe(true);
    });

    it("should return false when fallback has empty models array", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o", undefined, {
        fallback: {
          models: [],
          retries: 2,
          retryDelayMs: 1000,
        },
      });
      expect(provider.hasFallback()).toBe(false);
    });
  });

  describe("withModel", () => {
    it("should create new provider with different model", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o");
      const newProvider = provider.withModel("anthropic/claude-3-5-sonnet");

      expect(newProvider).toBeDefined();
      expect(newProvider.getModelString()).toBe("anthropic/claude-3-5-sonnet");
      expect(provider.getModelString()).toBe("openai/gpt-4o"); // Original unchanged
    });
  });

  describe("withFallback", () => {
    it("should create new provider with fallback configuration", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o");
      const newProvider = provider.withFallback({
        models: ["anthropic/claude-3-5-sonnet"],
        retries: 3,
        retryDelayMs: 2000,
      });

      expect(newProvider.hasFallback()).toBe(true);
      expect(provider.hasFallback()).toBe(false); // Original unchanged
    });
  });

  describe("getModelInfo", () => {
    it("should return model info from router", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o");
      const info = await provider.getModelInfo();

      expect(info).toBeDefined();
      expect(info?.id).toBe("openai/gpt-4o");
      expect(info?.provider).toBe("openai");
    });
  });

  describe("supportsCapability", () => {
    it("should check capability from model info", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o");

      expect(await provider.supportsCapability("chat")).toBe(true);
      expect(await provider.supportsCapability("functionCalling")).toBe(true);
      expect(await provider.supportsCapability("imageInput")).toBe(true);
      expect(await provider.supportsCapability("embedding")).toBe(false);
    });
  });

  describe("getAvailableModels", () => {
    it("should return available models from router", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o");
      const models = await provider.getAvailableModels();

      expect(models).toContain("openai/gpt-4o");
      expect(models).toContain("anthropic/claude-3-5-sonnet");
    });
  });

  describe("searchModels", () => {
    it("should search models via router", async () => {
      mockSearchModels.mockResolvedValue([
        { id: "openai/gpt-4o", provider: "openai", modelName: "gpt-4o" },
      ]);

      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o");
      const results = await provider.searchModels("gpt");

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("openai/gpt-4o");
    });
  });

  describe("handleProviderError", () => {
    it("should wrap errors with gateway context", async () => {
      const { GatewayProvider } = await import(
        "../../../src/lib/gateway/gatewayProvider.js"
      );
      const { GatewayError } = await import(
        "../../../src/lib/gateway/errors.js"
      );

      const provider = new GatewayProvider("openai/gpt-4o");
      const originalError = new Error("Original error message");
      const wrappedError = provider.handleProviderError(originalError);

      expect(wrappedError).toBeInstanceOf(GatewayError);
      expect(wrappedError.message).toContain("openai/gpt-4o");
      expect(wrappedError.message).toContain("Original error message");
    });
  });
});

// Separate describe block for disabled gateway test - requires complete module reset
describe("GatewayProvider - disabled gateway", () => {
  it("should throw GatewayDisabledError when GATEWAY_ENABLED is false", async () => {
    vi.resetModules();

    // Mock constants with gateway disabled
    vi.doMock(
      "../../../src/lib/gateway/constants.js",
      async (importOriginal) => {
        const actual =
          await importOriginal<
            typeof import("../../../src/lib/gateway/constants.js")
          >();
        return {
          ...actual,
          GATEWAY_ENABLED: false,
        };
      },
    );

    // Re-mock other dependencies
    vi.doMock("../../../src/lib/gateway/modelRouter.js", () => ({
      getGlobalRouter: () => ({}),
      resetGlobalRouter: vi.fn(),
    }));
    vi.doMock("../../../src/lib/gateway/fallbackManager.js", () => ({
      getGlobalFallbackManager: () => ({}),
    }));
    vi.doMock("../../../src/lib/core/baseProvider.js", () => ({
      BaseProvider: class MockBaseProvider {
        constructor() {}
      },
    }));

    const { GatewayProvider } = await import(
      "../../../src/lib/gateway/gatewayProvider.js"
    );
    const { GatewayDisabledError } = await import(
      "../../../src/lib/gateway/errors.js"
    );

    expect(() => new GatewayProvider("openai/gpt-4o")).toThrow(
      GatewayDisabledError,
    );
  });
});
