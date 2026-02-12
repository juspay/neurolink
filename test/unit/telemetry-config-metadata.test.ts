import { describe, it, expect, beforeEach } from "vitest";
import { TelemetryHandler } from "../../src/lib/core/modules/TelemetryHandler";
import { AIProviderName } from "../../src/lib/constants/enums";
import type { TextGenerationOptions, StreamOptions } from "../../src/lib/types";
import type { NeuroLink } from "../../src/lib/neurolink";

/**
 * Mock interface for NeuroLink that only includes the methods used by TelemetryHandler
 */
type MockNeuroLink = Pick<NeuroLink, "isTelemetryEnabled"> & {
  isTelemetryEnabled: () => boolean;
};

// Mock NeuroLink instance
const mockNeurolink: MockNeuroLink = {
  isTelemetryEnabled: () => true,
};

describe("TelemetryHandler - Custom Metadata Support", () => {
  let telemetryHandler: TelemetryHandler;

  beforeEach(() => {
    telemetryHandler = new TelemetryHandler(
      AIProviderName.OPENAI,
      "gpt-4",
      mockNeurolink as unknown as NeuroLink,
    );
  });

  describe("getTelemetryConfig", () => {
    it("should merge custom metadata into telemetry configuration", () => {
      const options: TextGenerationOptions = {
        prompt: "test prompt",
        context: {
          traceName: "my-trace",
          metadata: {
            userId: "12345",
            sessionId: "session-abc",
            customField: "custom-value",
            numericValue: 42,
            booleanValue: true,
          },
        },
      };

      const config = telemetryHandler.getTelemetryConfig(options, "generate");

      expect(config).toBeDefined();
      expect(config?.isEnabled).toBe(true);
      expect(config?.functionId).toBe("my-trace");
      expect(config?.metadata).toMatchObject({
        userId: "12345",
        sessionId: "session-abc",
        customField: "custom-value",
        numericValue: 42,
        booleanValue: true,
        provider: AIProviderName.OPENAI,
        model: "gpt-4",
        toolsEnabled: true,
        neurolink: true,
        operationType: "generate",
        originalProvider: AIProviderName.OPENAI,
      });
    });

    it("should use userId as functionId when traceName is not provided", () => {
      const options: StreamOptions = {
        input: { text: "test input" },
        context: {
          userId: "user-789",
          metadata: {
            department: "engineering",
          },
        },
      };

      const config = telemetryHandler.getTelemetryConfig(options, "stream");

      expect(config?.functionId).toBe("user-789");
      expect(config?.metadata).toMatchObject({
        department: "engineering",
        provider: AIProviderName.OPENAI,
        model: "gpt-4",
        operationType: "stream",
      });
    });

    it("should use 'guest' as functionId when neither traceName nor userId is provided", () => {
      const options = {
        prompt: "test prompt",
        context: {
          metadata: {
            requestType: "anonymous",
          },
        },
      };

      const config = telemetryHandler.getTelemetryConfig(options);

      expect(config?.functionId).toBe("guest");
      expect(config?.metadata).toMatchObject({
        requestType: "anonymous",
      });
    });

    it("should handle empty metadata object", () => {
      const options: TextGenerationOptions = {
        prompt: "test prompt",
        context: {
          traceName: "test-trace",
          metadata: {},
        },
      };

      const config = telemetryHandler.getTelemetryConfig(options);

      expect(config?.metadata).toMatchObject({
        provider: AIProviderName.OPENAI,
        model: "gpt-4",
        toolsEnabled: true,
        neurolink: true,
        operationType: "stream",
        originalProvider: AIProviderName.OPENAI,
      });
      expect(config?.metadata).not.toHaveProperty("metadata");
    });

    it("should handle undefined metadata", () => {
      const options: TextGenerationOptions = {
        prompt: "test prompt",
        context: {
          traceName: "test-trace",
          metadata: undefined,
        },
      };

      const config = telemetryHandler.getTelemetryConfig(options);

      expect(config?.metadata).toMatchObject({
        provider: AIProviderName.OPENAI,
        model: "gpt-4",
        toolsEnabled: true,
        neurolink: true,
        operationType: "stream",
        originalProvider: AIProviderName.OPENAI,
      });
    });

    it("should handle missing context", () => {
      const options: TextGenerationOptions = {
        prompt: "test prompt",
      };

      const config = telemetryHandler.getTelemetryConfig(options);

      expect(config?.functionId).toBe("guest");
      expect(config?.metadata).toMatchObject({
        provider: AIProviderName.OPENAI,
        model: "gpt-4",
        toolsEnabled: true,
        neurolink: true,
        operationType: "stream",
        originalProvider: AIProviderName.OPENAI,
      });
    });

    it("should include sessionId when provided in options", () => {
      const options: StreamOptions = {
        input: { text: "test input" },
        context: {
          traceName: "test-trace",
          metadata: {
            customField: "value",
          },
        },
        sessionId: "session-123",
      };

      const config = telemetryHandler.getTelemetryConfig(options, "stream");

      expect(config?.metadata).toMatchObject({
        sessionId: "session-123",
        customField: "value",
      });
    });

    it("should include sessionId when provided as number", () => {
      const options: StreamOptions = {
        input: { text: "test input" },
        context: { traceName: "test-trace" },
        sessionId: 123,
      };

      const config = telemetryHandler.getTelemetryConfig(options);

      expect(config?.metadata?.sessionId).toBe(123);
    });

    it("should include sessionId when provided as boolean", () => {
      const options: StreamOptions = {
        input: { text: "test input" },
        context: { traceName: "test-trace" },
        sessionId: true,
      };

      const config = telemetryHandler.getTelemetryConfig(options);

      expect(config?.metadata?.sessionId).toBe(true);
    });

    it("should reject invalid sessionId types", () => {
      const options: StreamOptions = {
        input: { text: "test input" },
        context: { traceName: "test-trace" },
        sessionId: {} as unknown as string, // Invalid type - testing runtime behavior
      };

      const config = telemetryHandler.getTelemetryConfig(options);

      expect(config?.metadata).not.toHaveProperty("sessionId");
    });

    it("should handle system field conflicts - system metadata fields should not be overridden", () => {
      // Testing that user-provided metadata cannot override system fields
      // Using type assertions to simulate invalid user input at runtime
      const options: TextGenerationOptions = {
        prompt: "test prompt",
        context: {
          traceName: "test-trace",
          metadata: {
            provider: "attempted-override",
            model: "attempted-override",
            toolsEnabled: false as unknown as string,
            neurolink: false as unknown as string,
            operationType: "attempted-override",
            originalProvider: "attempted-override",
          },
        },
      };

      const config = telemetryHandler.getTelemetryConfig(options);

      // System fields should maintain their values
      expect(config?.metadata?.provider).toBe(AIProviderName.OPENAI);
      expect(config?.metadata?.model).toBe("gpt-4");
      expect(config?.metadata?.toolsEnabled).toBe(true);
      expect(config?.metadata?.neurolink).toBe(true);
      expect(config?.metadata?.operationType).toBe("stream");
      expect(config?.metadata?.originalProvider).toBe(AIProviderName.OPENAI);
    });

    it("should respect disableTools option", () => {
      const options: TextGenerationOptions = {
        prompt: "test prompt",
        disableTools: true,
        context: {
          traceName: "test-trace",
        },
      };

      const config = telemetryHandler.getTelemetryConfig(options);

      expect(config?.metadata?.toolsEnabled).toBe(false);
    });

    it("should return undefined when telemetry is disabled", async () => {
      const disabledNeurolink: MockNeuroLink = {
        isTelemetryEnabled: () => false,
      };

      const disabledHandler = new TelemetryHandler(
        AIProviderName.ANTHROPIC,
        "claude-3",
        disabledNeurolink as unknown as NeuroLink,
      );

      const options: TextGenerationOptions = {
        prompt: "test prompt",
        context: {
          traceName: "test-trace",
          metadata: { customField: "value" },
        },
      };

      const config = disabledHandler.getTelemetryConfig(options);

      expect(config).toBeUndefined();
    });

    it("should work with different providers", () => {
      const anthropicHandler = new TelemetryHandler(
        AIProviderName.ANTHROPIC,
        "claude-3-opus-20240229",
        mockNeurolink as unknown as NeuroLink,
      );

      const options: StreamOptions = {
        input: { text: "test input" },
        context: {
          userId: "user-123",
          metadata: {
            region: "us-west",
          },
        },
      };

      const config = anthropicHandler.getTelemetryConfig(options, "stream");

      expect(config?.metadata?.provider).toBe(AIProviderName.ANTHROPIC);
      expect(config?.metadata?.model).toBe("claude-3-opus-20240229");
      expect(config?.metadata?.region).toBe("us-west");
    });
  });
});
