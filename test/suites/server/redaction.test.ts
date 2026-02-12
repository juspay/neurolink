import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  redactStreamChunk,
  createStreamRedactor,
} from "../../../src/lib/server/utils/redaction.js";
import type {
  DataStreamEvent,
  ToolCallEvent,
  ToolResultEvent,
  ErrorEvent,
  TextDeltaEvent,
} from "../../../src/lib/server/streaming/dataStream.js";

/**
 * Test-specific type for tool call chunks with flexible data structure
 */
type TestToolCallChunk = {
  type: "tool-call";
  timestamp: number;
  data: {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  };
};

/**
 * Test-specific type for tool result chunks
 */
type TestToolResultChunk = {
  type: "tool-result";
  timestamp: number;
  data: {
    id: string;
    name: string;
    result: unknown;
  };
};

/**
 * Test-specific type for error chunks
 */
type TestErrorChunk = {
  type: "error";
  timestamp: number;
  data: {
    message: string;
    stack?: string;
  };
};

/**
 * Test-specific type for text-delta chunks with additional fields
 */
type TestTextDeltaChunk = {
  type: "text-delta";
  timestamp: number;
  data: {
    text: string;
    [key: string]: unknown;
  };
};

describe("redactStreamChunk", () => {
  describe("disabled by default", () => {
    it("should NOT redact when enabled is not set", () => {
      const chunk: TestToolCallChunk = {
        type: "tool-call",
        timestamp: Date.now(),
        data: {
          id: "call-1",
          name: "readFile",
          arguments: { path: "/etc/passwd", apiKey: "secret" },
        },
      };

      // No config or enabled: false should return unchanged
      const result = redactStreamChunk(chunk as DataStreamEvent);

      expect(result).toEqual(chunk); // Unchanged
      const resultData = (result as ToolCallEvent).data;
      expect((resultData.arguments as Record<string, unknown>).apiKey).toBe(
        "secret",
      ); // NOT redacted
    });

    it("should NOT redact when enabled is explicitly false", () => {
      const chunk: TestToolResultChunk = {
        type: "tool-result",
        timestamp: Date.now(),
        data: { id: "call-1", name: "test", result: { secret: "value" } },
      };

      const result = redactStreamChunk(chunk as DataStreamEvent, {
        enabled: false,
      });

      expect(result).toEqual(chunk); // Unchanged
    });

    it("should redact ONLY when enabled is true", () => {
      const chunk: TestToolCallChunk = {
        type: "tool-call",
        timestamp: Date.now(),
        data: {
          id: "call-1",
          name: "readFile",
          arguments: { path: "/etc/passwd" },
        },
      };

      const result = redactStreamChunk(chunk as DataStreamEvent, {
        enabled: true,
      });

      const resultData = (result as ToolCallEvent).data;
      expect(resultData.name).toBe("readFile");
      expect(resultData.arguments).toBe("[REDACTED]");
    });
  });

  describe("when enabled", () => {
    const enabledConfig = { enabled: true };

    describe("tool-call chunks", () => {
      it("should redact tool arguments", () => {
        const chunk: TestToolCallChunk = {
          type: "tool-call",
          timestamp: Date.now(),
          data: {
            id: "call-1",
            name: "readFile",
            arguments: { path: "/etc/passwd" },
          },
        };

        const result = redactStreamChunk(
          chunk as DataStreamEvent,
          enabledConfig,
        );

        const resultData = (result as ToolCallEvent).data;
        expect(resultData.name).toBe("readFile");
        expect(resultData.arguments).toBe("[REDACTED]");
      });

      it("should preserve args when redactToolArgs is false", () => {
        const chunk: TestToolCallChunk = {
          type: "tool-call",
          timestamp: Date.now(),
          data: {
            id: "call-1",
            name: "calculateMath",
            arguments: { expression: "2+2" },
          },
        };

        const result = redactStreamChunk(chunk as DataStreamEvent, {
          enabled: true,
          redactToolArgs: false,
        });

        const resultData = (result as ToolCallEvent).data;
        expect(resultData.arguments).toEqual({ expression: "2+2" });
      });
    });

    describe("tool-result chunks", () => {
      it("should redact tool results", () => {
        const chunk: TestToolResultChunk = {
          type: "tool-result",
          timestamp: Date.now(),
          data: {
            id: "call-1",
            name: "readFile",
            result: { sensitiveData: "secret" },
          },
        };

        const result = redactStreamChunk(
          chunk as DataStreamEvent,
          enabledConfig,
        );

        const resultData = (result as ToolResultEvent).data;
        expect(resultData.result).toBe("[REDACTED]");
        expect(resultData.id).toBe("call-1");
      });
    });

    describe("error chunks", () => {
      let originalEnv: string | undefined;

      beforeEach(() => {
        originalEnv = process.env.NODE_ENV;
      });

      afterEach(() => {
        process.env.NODE_ENV = originalEnv;
      });

      it("should remove stack traces in production", () => {
        process.env.NODE_ENV = "production";

        const chunk: TestErrorChunk = {
          type: "error",
          timestamp: Date.now(),
          data: {
            message: "Something went wrong",
            stack: "Error: Something went wrong\n    at ...",
          },
        };

        const result = redactStreamChunk(
          chunk as DataStreamEvent,
          enabledConfig,
        );

        const resultData = (result as ErrorEvent).data as Record<
          string,
          unknown
        >;
        expect(resultData.stack).toBeUndefined();
        expect(resultData.message).toBe("Something went wrong");
      });

      it("should preserve stack traces in development", () => {
        process.env.NODE_ENV = "development";

        const chunk: TestErrorChunk = {
          type: "error",
          timestamp: Date.now(),
          data: {
            message: "Something went wrong",
            stack: "Error: Something went wrong\n    at ...",
          },
        };

        const result = redactStreamChunk(
          chunk as DataStreamEvent,
          enabledConfig,
        );

        const resultData = (result as ErrorEvent).data as Record<
          string,
          unknown
        >;
        expect(resultData.stack).toBe(
          "Error: Something went wrong\n    at ...",
        );
        expect(resultData.message).toBe("Something went wrong");
      });
    });

    describe("custom config options", () => {
      it("should redact additionalFields (case-insensitive matching)", () => {
        const chunk: TestTextDeltaChunk = {
          type: "text-delta",
          timestamp: Date.now(),
          data: {
            text: "Hello",
            customsecret: "should-be-redacted",
          },
        };

        // Note: additionalFields should be lowercase for case-insensitive matching
        const result = redactStreamChunk(chunk as DataStreamEvent, {
          enabled: true,
          additionalFields: ["customsecret"],
        });

        const resultData = (result as TextDeltaEvent).data as Record<
          string,
          unknown
        >;
        expect(resultData.customsecret).toBe("[REDACTED]");
        expect(resultData.text).toBe("Hello");
      });

      it("should preserve fields listed in preserveFields", () => {
        const chunk: TestToolResultChunk = {
          type: "tool-result",
          timestamp: Date.now(),
          data: {
            id: "call-1",
            name: "test",
            result: { sensitiveData: "should-be-preserved" },
          },
        };

        const result = redactStreamChunk(chunk as DataStreamEvent, {
          enabled: true,
          preserveFields: ["result"],
        });

        const resultData = (result as ToolResultEvent).data;
        expect(resultData.result).toEqual({
          sensitiveData: "should-be-preserved",
        });
      });

      it("should use custom placeholder when specified", () => {
        const chunk: TestToolCallChunk = {
          type: "tool-call",
          timestamp: Date.now(),
          data: {
            id: "call-1",
            name: "readFile",
            arguments: { path: "/etc/passwd" },
          },
        };

        const result = redactStreamChunk(chunk as DataStreamEvent, {
          enabled: true,
          placeholder: "***HIDDEN***",
        });

        const resultData = (result as ToolCallEvent).data;
        expect(resultData.arguments).toBe("***HIDDEN***");
      });
    });
  });

  describe("createStreamRedactor", () => {
    it("should not redact when enabled is not set", () => {
      const redactor = createStreamRedactor(); // No config

      const chunk: TestToolResultChunk = {
        type: "tool-result",
        timestamp: Date.now(),
        data: { id: "call-1", name: "test", result: "secret" },
      };

      expect(redactor(chunk as DataStreamEvent)).toEqual(chunk); // Unchanged
    });

    it("should create reusable redactor function when enabled", () => {
      const redactor = createStreamRedactor({
        enabled: true,
        redactToolResults: true,
      });

      const chunk1: TestToolResultChunk = {
        type: "tool-result",
        timestamp: Date.now(),
        data: { id: "1", name: "t1", result: "secret1" },
      };
      const chunk2: TestToolResultChunk = {
        type: "tool-result",
        timestamp: Date.now(),
        data: { id: "2", name: "t2", result: "secret2" },
      };

      const result1 = redactor(chunk1 as DataStreamEvent) as ToolResultEvent;
      const result2 = redactor(chunk2 as DataStreamEvent) as ToolResultEvent;
      expect(result1.data.result).toBe("[REDACTED]");
      expect(result2.data.result).toBe("[REDACTED]");
    });

    it("should pass through non-object chunks unchanged", () => {
      const redactor = createStreamRedactor({ enabled: true });

      // Test with null-ish values - using unknown type for edge case testing
      expect(redactor(null as unknown as DataStreamEvent)).toBeNull();
      expect(redactor(undefined as unknown as DataStreamEvent)).toBeUndefined();
    });
  });
});
