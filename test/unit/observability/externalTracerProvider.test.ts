/**
 * External TracerProvider Support Tests
 * Tests for external OpenTelemetry TracerProvider integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock logger before importing module
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock OpenTelemetry modules
vi.mock("@opentelemetry/api", () => ({
  trace: {
    getTracerProvider: vi.fn(),
  },
}));

vi.mock("@opentelemetry/sdk-trace-node", () => ({
  NodeTracerProvider: vi.fn().mockImplementation(() => ({
    register: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@opentelemetry/resources", () => ({
  resourceFromAttributes: vi.fn().mockReturnValue({}),
}));

vi.mock("@opentelemetry/semantic-conventions", () => ({
  ATTR_SERVICE_NAME: "service.name",
  ATTR_SERVICE_VERSION: "service.version",
}));

vi.mock("@langfuse/otel", () => ({
  LangfuseSpanProcessor: vi.fn().mockImplementation(() => ({
    forceFlush: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("External TracerProvider Support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module state between tests
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initializeOpenTelemetry", () => {
    it("should register provider when no external provider exists (default behavior)", async () => {
      const {
        initializeOpenTelemetry,
        isUsingExternalTracerProvider,
        getTracerProvider,
      } = await import(
        "../../../src/lib/services/server/ai/observability/instrumentation.js"
      );

      initializeOpenTelemetry({
        enabled: true,
        publicKey: "pk-test",
        secretKey: "sk-test",
      });

      expect(isUsingExternalTracerProvider()).toBe(false);
      expect(getTracerProvider()).not.toBeNull();
    });

    it("should skip registration when useExternalTracerProvider is true", async () => {
      const {
        initializeOpenTelemetry,
        isUsingExternalTracerProvider,
        getTracerProvider,
        getLangfuseSpanProcessor,
      } = await import(
        "../../../src/lib/services/server/ai/observability/instrumentation.js"
      );

      initializeOpenTelemetry({
        enabled: true,
        publicKey: "pk-test",
        secretKey: "sk-test",
        useExternalTracerProvider: true,
      });

      expect(isUsingExternalTracerProvider()).toBe(true);
      expect(getTracerProvider()).toBeNull();
      expect(getLangfuseSpanProcessor()).not.toBeNull();
    });

    it("should auto-detect external provider when autoDetectExternalProvider is true", async () => {
      // Setup: Mock existing provider
      const { trace } = await import("@opentelemetry/api");
      vi.mocked(trace.getTracerProvider).mockReturnValue({
        constructor: { name: "NodeTracerProvider" },
      } as never);

      const { initializeOpenTelemetry, isUsingExternalTracerProvider } =
        await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

      initializeOpenTelemetry({
        enabled: true,
        publicKey: "pk-test",
        secretKey: "sk-test",
        autoDetectExternalProvider: true,
      });

      expect(isUsingExternalTracerProvider()).toBe(true);
    });

    it("should use standalone mode when autoDetect not set (even with ProxyTracerProvider)", async () => {
      // Setup: Mock ProxyTracerProvider (default no-op)
      const { trace } = await import("@opentelemetry/api");
      vi.mocked(trace.getTracerProvider).mockReturnValue({
        constructor: { name: "ProxyTracerProvider" },
      } as never);

      // Re-apply NodeTracerProvider mock after resetModules
      const { NodeTracerProvider } = await import(
        "@opentelemetry/sdk-trace-node"
      );
      vi.mocked(NodeTracerProvider).mockImplementation(
        () =>
          ({
            register: vi.fn(),
            shutdown: vi.fn().mockResolvedValue(undefined),
          }) as never,
      );

      const { initializeOpenTelemetry, isUsingExternalTracerProvider } =
        await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

      // Standalone mode: enabled=true, no external provider flags
      // Should create its own TracerProvider, NOT enter external mode
      initializeOpenTelemetry({
        enabled: true,
        publicKey: "pk-test",
        secretKey: "sk-test",
        // Note: NOT setting autoDetectExternalProvider or useExternalTracerProvider
      });

      expect(isUsingExternalTracerProvider()).toBe(false);
    });

    it("should skip initialization when disabled", async () => {
      const { initializeOpenTelemetry, isOpenTelemetryInitialized } =
        await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

      initializeOpenTelemetry({
        enabled: false,
        publicKey: "pk-test",
        secretKey: "sk-test",
      });

      expect(isOpenTelemetryInitialized()).toBe(true);
    });

    it("should skip initialization when missing credentials", async () => {
      const { initializeOpenTelemetry, getLangfuseHealthStatus } = await import(
        "../../../src/lib/services/server/ai/observability/instrumentation.js"
      );

      initializeOpenTelemetry({
        enabled: true,
        publicKey: "",
        secretKey: "sk-test",
      });

      const status = getLangfuseHealthStatus();
      expect(status.credentialsValid).toBe(false);
    });
  });

  describe("getSpanProcessors", () => {
    it("should return span processors when initialized with external mode", async () => {
      const { initializeOpenTelemetry, getSpanProcessors } = await import(
        "../../../src/lib/services/server/ai/observability/instrumentation.js"
      );

      initializeOpenTelemetry({
        enabled: true,
        publicKey: "pk-test",
        secretKey: "sk-test",
        useExternalTracerProvider: true,
      });

      const processors = getSpanProcessors();
      expect(processors).toHaveLength(2);
    });

    it("should return empty array when not initialized", async () => {
      const { getSpanProcessors } = await import(
        "../../../src/lib/services/server/ai/observability/instrumentation.js"
      );

      const processors = getSpanProcessors();
      expect(processors).toHaveLength(0);
    });
  });

  describe("createContextEnricher", () => {
    it("should create a new ContextEnricher instance", async () => {
      const { createContextEnricher } = await import(
        "../../../src/lib/services/server/ai/observability/instrumentation.js"
      );

      const enricher = createContextEnricher();
      expect(enricher).toBeDefined();
      expect(enricher.onStart).toBeDefined();
      expect(enricher.onEnd).toBeDefined();
      expect(enricher.shutdown).toBeDefined();
      expect(enricher.forceFlush).toBeDefined();
    });
  });

  describe("getLangfuseHealthStatus", () => {
    it("should include usingExternalProvider in health status", async () => {
      const { initializeOpenTelemetry, getLangfuseHealthStatus } = await import(
        "../../../src/lib/services/server/ai/observability/instrumentation.js"
      );

      initializeOpenTelemetry({
        enabled: true,
        publicKey: "pk-test",
        secretKey: "sk-test",
        useExternalTracerProvider: true,
      });

      const status = getLangfuseHealthStatus();
      expect(status).toHaveProperty("usingExternalProvider");
      expect(status.usingExternalProvider).toBe(true);
    });

    it("should report healthy status with external provider", async () => {
      const { initializeOpenTelemetry, getLangfuseHealthStatus } = await import(
        "../../../src/lib/services/server/ai/observability/instrumentation.js"
      );

      initializeOpenTelemetry({
        enabled: true,
        publicKey: "pk-test",
        secretKey: "sk-test",
        useExternalTracerProvider: true,
      });

      const status = getLangfuseHealthStatus();
      expect(status.isHealthy).toBe(true);
      expect(status.initialized).toBe(true);
      expect(status.credentialsValid).toBe(true);
      expect(status.hasProcessor).toBe(true);
    });
  });

  describe("graceful error handling", () => {
    it("should handle duplicate registration gracefully", async () => {
      const { NodeTracerProvider } = await import(
        "@opentelemetry/sdk-trace-node"
      );
      vi.mocked(NodeTracerProvider).mockImplementation(
        () =>
          ({
            register: vi.fn().mockImplementation(() => {
              throw new Error("duplicate registration of API: trace");
            }),
            shutdown: vi.fn().mockResolvedValue(undefined),
          }) as never,
      );

      const { initializeOpenTelemetry, isUsingExternalTracerProvider } =
        await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

      // Should not throw
      expect(() => {
        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });
      }).not.toThrow();

      // Should have switched to external mode
      expect(isUsingExternalTracerProvider()).toBe(true);
    });
  });

  describe("shutdownOpenTelemetry", () => {
    it("should not shutdown tracerProvider in external mode", async () => {
      const mockShutdown = vi.fn().mockResolvedValue(undefined);
      const { NodeTracerProvider } = await import(
        "@opentelemetry/sdk-trace-node"
      );
      vi.mocked(NodeTracerProvider).mockImplementation(
        () =>
          ({
            register: vi.fn(),
            shutdown: mockShutdown,
          }) as never,
      );

      const { initializeOpenTelemetry, shutdownOpenTelemetry } = await import(
        "../../../src/lib/services/server/ai/observability/instrumentation.js"
      );

      initializeOpenTelemetry({
        enabled: true,
        publicKey: "pk-test",
        secretKey: "sk-test",
        useExternalTracerProvider: true,
      });

      await shutdownOpenTelemetry();

      // TracerProvider.shutdown should NOT be called in external mode
      expect(mockShutdown).not.toHaveBeenCalled();
    });

    it("should shutdown tracerProvider in standalone mode", async () => {
      const mockShutdown = vi.fn().mockResolvedValue(undefined);
      const { NodeTracerProvider } = await import(
        "@opentelemetry/sdk-trace-node"
      );
      vi.mocked(NodeTracerProvider).mockImplementation(
        () =>
          ({
            register: vi.fn(),
            shutdown: mockShutdown,
          }) as never,
      );

      const { initializeOpenTelemetry, shutdownOpenTelemetry } = await import(
        "../../../src/lib/services/server/ai/observability/instrumentation.js"
      );

      initializeOpenTelemetry({
        enabled: true,
        publicKey: "pk-test",
        secretKey: "sk-test",
      });

      await shutdownOpenTelemetry();

      // TracerProvider.shutdown SHOULD be called in standalone mode
      expect(mockShutdown).toHaveBeenCalled();
    });
  });

  describe("isUsingExternalTracerProvider", () => {
    it("should return false by default", async () => {
      const { isUsingExternalTracerProvider } = await import(
        "../../../src/lib/services/server/ai/observability/instrumentation.js"
      );

      expect(isUsingExternalTracerProvider()).toBe(false);
    });

    it("should return true after external mode initialization", async () => {
      const { initializeOpenTelemetry, isUsingExternalTracerProvider } =
        await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

      initializeOpenTelemetry({
        enabled: true,
        publicKey: "pk-test",
        secretKey: "sk-test",
        useExternalTracerProvider: true,
      });

      expect(isUsingExternalTracerProvider()).toBe(true);
    });
  });

  describe("operationName feature", () => {
    /**
     * Helper to create a mock span for testing ContextEnricher
     */
    function createMockSpan(
      spanName?: string,
      traceId: string = "test-trace-id",
    ) {
      const attributes: Record<string, unknown> = {};
      return {
        name: spanName,
        setAttribute: vi.fn((key: string, value: unknown) => {
          attributes[key] = value;
        }),
        spanContext: vi.fn(() => ({
          traceId,
          spanId: "test-span-id",
          traceFlags: 1,
        })),
        _getAttributes: () => attributes,
      };
    }

    describe("auto-detection of operation names", () => {
      it("should auto-detect operation name from ai.streamText span", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan("ai.streamText");

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        expect(attrs["gen_ai.operation.name"]).toBe("ai.streamText");
        expect(attrs["langfuse.trace.name"]).toBe("guest:ai.streamText");
      });

      it("should auto-detect operation name from ai.generateText span", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan("ai.generateText");

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        expect(attrs["gen_ai.operation.name"]).toBe("ai.generateText");
      });

      it("should auto-detect operation name from ai.generateObject span", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan("ai.generateObject");

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        expect(attrs["gen_ai.operation.name"]).toBe("ai.generateObject");
      });

      it("should auto-detect operation name from chat span (OpenTelemetry GenAI convention)", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan("chat");

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        expect(attrs["gen_ai.operation.name"]).toBe("chat");
      });

      it("should auto-detect operation name from embeddings span", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan("embeddings");

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        expect(attrs["gen_ai.operation.name"]).toBe("embeddings");
      });

      it("should auto-detect operation name from text_completion span", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan("text_completion");

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        expect(attrs["gen_ai.operation.name"]).toBe("text_completion");
      });

      it("should not auto-detect operation name from non-AI span names", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan("http.request");

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        expect(attrs["gen_ai.operation.name"]).toBeUndefined();
        expect(attrs["langfuse.trace.name"]).toBe("guest");
      });
    });

    describe("explicit operationName in context", () => {
      it("should override auto-detection when explicit operationName is provided", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();

        await setLangfuseContext(
          { operationName: "custom-operation", userId: "user@email.com" },
          async () => {
            const mockSpan = createMockSpan("ai.streamText");
            enricher.onStart(mockSpan as never);

            const attrs = mockSpan._getAttributes();
            expect(attrs["gen_ai.operation.name"]).toBe("custom-operation");
            expect(attrs["langfuse.trace.name"]).toBe(
              "user@email.com:custom-operation",
            );
          },
        );
      });
    });

    describe("explicit traceName in context", () => {
      it("should override everything when explicit traceName is provided (backward compatibility)", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();

        await setLangfuseContext(
          {
            traceName: "my-custom-trace-name",
            operationName: "custom-operation",
            userId: "user@email.com",
          },
          async () => {
            const mockSpan = createMockSpan("ai.streamText");
            enricher.onStart(mockSpan as never);

            const attrs = mockSpan._getAttributes();
            // traceName should win over everything
            expect(attrs["langfuse.trace.name"]).toBe("my-custom-trace-name");
            // But operation name is still set
            expect(attrs["gen_ai.operation.name"]).toBe("custom-operation");
          },
        );
      });

      it("should use explicit traceName even when no operationName or userId", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();

        await setLangfuseContext(
          { traceName: "standalone-trace-name" },
          async () => {
            const mockSpan = createMockSpan("some-span");
            enricher.onStart(mockSpan as never);

            const attrs = mockSpan._getAttributes();
            expect(attrs["langfuse.trace.name"]).toBe("standalone-trace-name");
          },
        );
      });
    });

    describe("autoDetectOperationName: false", () => {
      it("should disable auto-detection when global autoDetectOperationName is false", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
          autoDetectOperationName: false,
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan("ai.streamText");

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        // Should not auto-detect operation name
        expect(attrs["gen_ai.operation.name"]).toBeUndefined();
        // Should use userId only for trace name
        expect(attrs["langfuse.trace.name"]).toBe("guest");
      });
    });

    describe("context-level autoDetectOperationName override", () => {
      it("should disable auto-detection for specific context when context autoDetectOperationName is false", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        // Global auto-detect is enabled (default)
        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();

        // But context-level disables it
        await setLangfuseContext(
          { autoDetectOperationName: false, userId: "user@test.com" },
          async () => {
            const mockSpan = createMockSpan("ai.streamText");
            enricher.onStart(mockSpan as never);

            const attrs = mockSpan._getAttributes();
            // Should not auto-detect operation name
            expect(attrs["gen_ai.operation.name"]).toBeUndefined();
            // Should use userId only for trace name
            expect(attrs["langfuse.trace.name"]).toBe("user@test.com");
          },
        );
      });

      it("should enable auto-detection for specific context even when global is disabled", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        // Global auto-detect is disabled
        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
          autoDetectOperationName: false,
        });

        const enricher = createContextEnricher();

        // But context-level enables it
        await setLangfuseContext(
          { autoDetectOperationName: true, userId: "user@test.com" },
          async () => {
            const mockSpan = createMockSpan("ai.streamText");
            enricher.onStart(mockSpan as never);

            const attrs = mockSpan._getAttributes();
            // Should auto-detect operation name due to context override
            expect(attrs["gen_ai.operation.name"]).toBe("ai.streamText");
            expect(attrs["langfuse.trace.name"]).toBe(
              "user@test.com:ai.streamText",
            );
          },
        );
      });
    });

    describe("custom traceNameFormat function", () => {
      it("should use custom function for trace name formatting", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
          traceNameFormat: (ctx) =>
            `[${ctx.operationName || "unknown"}] ${ctx.userId}`,
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan("ai.streamText");

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        expect(attrs["langfuse.trace.name"]).toBe("[ai.streamText] guest");
      });

      it("should handle custom function when operationName is undefined", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
          traceNameFormat: (ctx) =>
            `[${ctx.operationName || "unknown"}] ${ctx.userId}`,
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan("http.request");

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        expect(attrs["langfuse.trace.name"]).toBe("[unknown] guest");
      });
    });

    describe("traceNameFormat string options", () => {
      it('should format trace name as "userId:operationName" (default)', async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
          traceNameFormat: "userId:operationName",
        });

        const enricher = createContextEnricher();

        await setLangfuseContext({ userId: "john@example.com" }, async () => {
          const mockSpan = createMockSpan("ai.generateText");
          enricher.onStart(mockSpan as never);

          const attrs = mockSpan._getAttributes();
          expect(attrs["langfuse.trace.name"]).toBe(
            "john@example.com:ai.generateText",
          );
        });
      });

      it('should format trace name as "operationName:userId"', async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
          traceNameFormat: "operationName:userId",
        });

        const enricher = createContextEnricher();

        await setLangfuseContext({ userId: "john@example.com" }, async () => {
          const mockSpan = createMockSpan("ai.generateText");
          enricher.onStart(mockSpan as never);

          const attrs = mockSpan._getAttributes();
          expect(attrs["langfuse.trace.name"]).toBe(
            "ai.generateText:john@example.com",
          );
        });
      });

      it('should format trace name as "operationName" only', async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
          traceNameFormat: "operationName",
        });

        const enricher = createContextEnricher();

        await setLangfuseContext({ userId: "john@example.com" }, async () => {
          const mockSpan = createMockSpan("ai.generateText");
          enricher.onStart(mockSpan as never);

          const attrs = mockSpan._getAttributes();
          expect(attrs["langfuse.trace.name"]).toBe("ai.generateText");
        });
      });

      it('should format trace name as "userId" only', async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
          traceNameFormat: "userId",
        });

        const enricher = createContextEnricher();

        await setLangfuseContext({ userId: "john@example.com" }, async () => {
          const mockSpan = createMockSpan("ai.generateText");
          enricher.onStart(mockSpan as never);

          const attrs = mockSpan._getAttributes();
          expect(attrs["langfuse.trace.name"]).toBe("john@example.com");
        });
      });
    });

    describe("fallback behavior", () => {
      it("should fall back to userId when no operation detected", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();

        await setLangfuseContext({ userId: "user@test.com" }, async () => {
          const mockSpan = createMockSpan("some-random-span");
          enricher.onStart(mockSpan as never);

          const attrs = mockSpan._getAttributes();
          // No operation detected, should fall back to userId
          expect(attrs["gen_ai.operation.name"]).toBeUndefined();
          expect(attrs["langfuse.trace.name"]).toBe("user@test.com");
        });
      });

      it("should fall back to userId when operationName format specified but no operation detected", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
          traceNameFormat: "operationName",
        });

        const enricher = createContextEnricher();

        await setLangfuseContext({ userId: "user@test.com" }, async () => {
          const mockSpan = createMockSpan("http.request");
          enricher.onStart(mockSpan as never);

          const attrs = mockSpan._getAttributes();
          // No operation detected with "operationName" format should fall back to userId
          expect(attrs["langfuse.trace.name"]).toBe("user@test.com");
        });
      });

      it("should use guest as default when no userId provided", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan("http.request");

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        expect(attrs["langfuse.trace.name"]).toBe("guest");
      });
    });

    describe("span attributes", () => {
      it("should set gen_ai.operation.name attribute when operation is detected", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan("ai.embedText");

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        expect(attrs["gen_ai.operation.name"]).toBe("ai.embedText");
      });

      it("should set langfuse.trace.name attribute with formatted trace name", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();

        await setLangfuseContext({ userId: "admin@company.com" }, async () => {
          const mockSpan = createMockSpan("ai.streamObject");
          enricher.onStart(mockSpan as never);

          const attrs = mockSpan._getAttributes();
          expect(attrs["langfuse.trace.name"]).toBe(
            "admin@company.com:ai.streamObject",
          );
          expect(attrs["trace.name"]).toBe("admin@company.com:ai.streamObject");
        });
      });

      it("should set both trace.name and langfuse.trace.name for compatibility", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan("ai.generateText");

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        expect(attrs["langfuse.trace.name"]).toBe("guest:ai.generateText");
        expect(attrs["trace.name"]).toBe("guest:ai.generateText");
      });
    });

    describe("edge cases", () => {
      it("should handle undefined span name gracefully", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan(undefined);

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        expect(attrs["gen_ai.operation.name"]).toBeUndefined();
        expect(attrs["langfuse.trace.name"]).toBe("guest");
      });

      it("should handle empty span name gracefully", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan("");

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        expect(attrs["gen_ai.operation.name"]).toBeUndefined();
        expect(attrs["langfuse.trace.name"]).toBe("guest");
      });

      it("should handle explicit null operationName in context", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();

        await setLangfuseContext(
          { operationName: null, userId: "user@test.com" },
          async () => {
            const mockSpan = createMockSpan("ai.streamText");
            enricher.onStart(mockSpan as never);

            const attrs = mockSpan._getAttributes();
            // null operationName should still allow auto-detection
            expect(attrs["gen_ai.operation.name"]).toBe("ai.streamText");
          },
        );
      });

      it("should use config userId when context userId is not set", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const { initializeOpenTelemetry, createContextEnricher } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
          userId: "config-user@test.com",
        });

        const enricher = createContextEnricher();
        const mockSpan = createMockSpan("ai.streamText");

        enricher.onStart(mockSpan as never);

        const attrs = mockSpan._getAttributes();
        expect(attrs["langfuse.trace.name"]).toBe(
          "config-user@test.com:ai.streamText",
        );
        expect(attrs["user.id"]).toBe("config-user@test.com");
      });
    });

    describe("wrapper span support (trace-root spans)", () => {
      /**
       * Helper to create a mock span for testing onEnd() with trace-root
       */
      function createMockSpanWithAttributes(
        spanName: string,
        initialAttributes: Record<string, unknown> = {},
        traceId: string = "test-trace-id",
      ) {
        const attributes: Record<string, unknown> = { ...initialAttributes };
        return {
          name: spanName,
          setAttribute: vi.fn((key: string, value: unknown) => {
            attributes[key] = value;
          }),
          spanContext: vi.fn(() => ({
            traceId,
            spanId: "test-span-id",
            traceFlags: 1,
          })),
          attributes,
          _getAttributes: () => attributes,
        };
      }

      it("should update trace-root span name in onEnd() with detected operation", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const traceId = "shared-trace-id-123";

        await setLangfuseContext({ userId: "user@test.com" }, async () => {
          // Step 1: Wrapper span starts (no AI operation detected yet)
          const wrapperSpan = createMockSpanWithAttributes(
            "langfuse-trace",
            { "user.id": "user@test.com" },
            traceId,
          );
          enricher.onStart(wrapperSpan as never);

          // Wrapper span should have userId only at this point
          expect(wrapperSpan._getAttributes()["langfuse.trace.name"]).toBe(
            "user@test.com",
          );

          // Step 2: AI SDK span starts (operation detected)
          const aiSpan = createMockSpanWithAttributes(
            "ai.streamText",
            {},
            traceId,
          );
          enricher.onStart(aiSpan as never);

          // Step 3: AI SDK span ends
          enricher.onEnd(aiSpan as never);

          // Step 4: Wrapper (trace-root) span ends - should update trace name
          wrapperSpan.attributes["langfuse.span.type"] = "trace-root";
          enricher.onEnd(wrapperSpan as never);

          // Trace name should be updated with detected operation
          expect(wrapperSpan.setAttribute).toHaveBeenCalledWith(
            "langfuse.trace.name",
            "user@test.com:ai.streamText",
          );
          expect(wrapperSpan.setAttribute).toHaveBeenCalledWith(
            "gen_ai.operation.name",
            "ai.streamText",
          );
        });
      });

      it("should not override explicit traceName on trace-root span", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const traceId = "trace-with-explicit-name";

        await setLangfuseContext(
          { userId: "user@test.com", traceName: "my-explicit-trace" },
          async () => {
            // Wrapper span with explicit traceName
            const wrapperSpan = createMockSpanWithAttributes(
              "langfuse-trace",
              {
                "user.id": "user@test.com",
                "langfuse.trace.name": "my-explicit-trace",
              },
              traceId,
            );
            enricher.onStart(wrapperSpan as never);

            // AI SDK span
            const aiSpan = createMockSpanWithAttributes(
              "ai.generateText",
              {},
              traceId,
            );
            enricher.onStart(aiSpan as never);
            enricher.onEnd(aiSpan as never);

            // Wrapper span ends
            wrapperSpan.attributes["langfuse.span.type"] = "trace-root";

            // Clear mock to check what happens in onEnd
            wrapperSpan.setAttribute.mockClear();
            enricher.onEnd(wrapperSpan as never);

            // Should NOT override the explicit traceName
            const setAttrCalls = wrapperSpan.setAttribute.mock.calls;
            const traceNameCall = setAttrCalls.find(
              (call: unknown[]) => call[0] === "langfuse.trace.name",
            );
            expect(traceNameCall).toBeUndefined();
          },
        );
      });

      it("should handle multiple AI operations - use first detected", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const traceId = "multi-operation-trace";

        await setLangfuseContext({ userId: "user@test.com" }, async () => {
          const wrapperSpan = createMockSpanWithAttributes(
            "langfuse-trace",
            { "user.id": "user@test.com" },
            traceId,
          );
          enricher.onStart(wrapperSpan as never);

          // First AI operation
          const aiSpan1 = createMockSpanWithAttributes(
            "ai.streamText",
            {},
            traceId,
          );
          enricher.onStart(aiSpan1 as never);

          // Second AI operation (should not override first)
          const aiSpan2 = createMockSpanWithAttributes(
            "ai.generateObject",
            {},
            traceId,
          );
          enricher.onStart(aiSpan2 as never);

          enricher.onEnd(aiSpan1 as never);
          enricher.onEnd(aiSpan2 as never);

          wrapperSpan.attributes["langfuse.span.type"] = "trace-root";
          enricher.onEnd(wrapperSpan as never);

          // Should use first detected operation
          expect(wrapperSpan.setAttribute).toHaveBeenCalledWith(
            "langfuse.trace.name",
            "user@test.com:ai.streamText",
          );
        });
      });

      it("should not update non-trace-root spans in onEnd()", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const traceId = "non-trace-root-test";

        await setLangfuseContext({ userId: "user@test.com" }, async () => {
          // Regular span (not trace-root)
          const regularSpan = createMockSpanWithAttributes(
            "http-handler",
            { "user.id": "user@test.com" },
            traceId,
          );
          enricher.onStart(regularSpan as never);

          // AI span
          const aiSpan = createMockSpanWithAttributes(
            "ai.streamText",
            {},
            traceId,
          );
          enricher.onStart(aiSpan as never);
          enricher.onEnd(aiSpan as never);

          // Regular span ends (no trace-root attribute)
          regularSpan.setAttribute.mockClear();
          enricher.onEnd(regularSpan as never);

          // Should NOT update trace name on non-trace-root spans
          const setAttrCalls = regularSpan.setAttribute.mock.calls;
          const traceNameCall = setAttrCalls.find(
            (call: unknown[]) => call[0] === "langfuse.trace.name",
          );
          expect(traceNameCall).toBeUndefined();
        });
      });

      it("should cleanup detected operations after trace-root span ends", async () => {
        const { NodeTracerProvider } = await import(
          "@opentelemetry/sdk-trace-node"
        );
        vi.mocked(NodeTracerProvider).mockImplementation(
          () =>
            ({
              register: vi.fn(),
              shutdown: vi.fn().mockResolvedValue(undefined),
            }) as never,
        );

        const {
          initializeOpenTelemetry,
          createContextEnricher,
          setLangfuseContext,
        } = await import(
          "../../../src/lib/services/server/ai/observability/instrumentation.js"
        );

        initializeOpenTelemetry({
          enabled: true,
          publicKey: "pk-test",
          secretKey: "sk-test",
        });

        const enricher = createContextEnricher();
        const traceId = "cleanup-test-trace";

        await setLangfuseContext({ userId: "user@test.com" }, async () => {
          // First trace
          const wrapperSpan1 = createMockSpanWithAttributes(
            "langfuse-trace",
            { "user.id": "user@test.com" },
            traceId,
          );
          enricher.onStart(wrapperSpan1 as never);

          const aiSpan1 = createMockSpanWithAttributes(
            "ai.streamText",
            {},
            traceId,
          );
          enricher.onStart(aiSpan1 as never);
          enricher.onEnd(aiSpan1 as never);

          wrapperSpan1.attributes["langfuse.span.type"] = "trace-root";
          enricher.onEnd(wrapperSpan1 as never);

          // Second trace with same traceId should start fresh
          const wrapperSpan2 = createMockSpanWithAttributes(
            "langfuse-trace",
            { "user.id": "user@test.com" },
            traceId,
          );
          enricher.onStart(wrapperSpan2 as never);

          // No AI span this time
          wrapperSpan2.attributes["langfuse.span.type"] = "trace-root";
          wrapperSpan2.setAttribute.mockClear();
          enricher.onEnd(wrapperSpan2 as never);

          // Should NOT have operation from previous trace
          const setAttrCalls = wrapperSpan2.setAttribute.mock.calls;
          const opNameCall = setAttrCalls.find(
            (call: unknown[]) => call[0] === "gen_ai.operation.name",
          );
          expect(opNameCall).toBeUndefined();
        });
      });
    });
  });
});
