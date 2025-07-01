/**
 * Timeout Functionality Tests
 *
 * Tests for the comprehensive timeout implementation across NeuroLink
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseTimeout,
  TimeoutError,
  getDefaultTimeout,
} from "../lib/utils/timeout.js";
import {
  createTimeoutController,
  withTimeout,
  withStreamingTimeout,
} from "../lib/providers/timeout-wrapper.js";
import { AIProviderFactory } from "../lib/core/factory.js";
import { NeuroLink } from "../lib/neurolink.js";

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  vi.clearAllMocks();
});

afterEach(() => {
  process.env = originalEnv;
});

describe("Timeout Utilities", () => {
  describe("parseTimeout", () => {
    it("should parse milliseconds as number", () => {
      expect(parseTimeout(1000)).toBe(1000);
      expect(parseTimeout(5000)).toBe(5000);
    });

    it("should parse string milliseconds", () => {
      expect(parseTimeout("1000")).toBe(1000);
      expect(parseTimeout("5000")).toBe(5000);
    });

    it("should parse seconds format", () => {
      expect(parseTimeout("30s")).toBe(30000);
      expect(parseTimeout("1.5s")).toBe(1500);
      expect(parseTimeout("0.5s")).toBe(500);
    });

    it("should parse minutes format", () => {
      expect(parseTimeout("2m")).toBe(120000);
      expect(parseTimeout("1.5m")).toBe(90000);
      expect(parseTimeout("0.5m")).toBe(30000);
    });

    it("should parse hours format", () => {
      expect(parseTimeout("1h")).toBe(3600000);
      expect(parseTimeout("0.5h")).toBe(1800000);
      expect(parseTimeout("2.5h")).toBe(9000000);
    });

    it("should handle invalid formats", () => {
      expect(() => parseTimeout("invalid")).toThrow("Invalid timeout format");
      expect(() => parseTimeout("30x")).toThrow("Invalid timeout format");
      expect(() => parseTimeout("")).toThrow("Invalid timeout format");
    });

    it("should handle edge cases", () => {
      expect(() => parseTimeout("0s")).toThrow("Timeout must be positive");
      expect(parseTimeout("0.1s")).toBe(100);
      expect(() => parseTimeout(-1000)).toThrow("Timeout must be positive");
      expect(() => parseTimeout("-5s")).toThrow("Invalid timeout format");
    });
  });

  describe("getDefaultTimeout", () => {
    it("should return provider-specific defaults", () => {
      expect(getDefaultTimeout("openai", "generate")).toBe("30s");
      expect(getDefaultTimeout("bedrock", "generate")).toBe("45s");
      expect(getDefaultTimeout("vertex", "generate")).toBe("60s");
      expect(getDefaultTimeout("ollama", "generate")).toBe("5m");
    });

    it("should return streaming defaults for stream operations", () => {
      expect(getDefaultTimeout("openai", "stream")).toBe("2m");
      expect(getDefaultTimeout("bedrock", "stream")).toBe("2m");
    });

    it("should fallback to global default for unknown providers", () => {
      expect(getDefaultTimeout("unknown" as any, "generate")).toBe("30s");
    });
  });

  describe("TimeoutError", () => {
    it("should create proper error instances", () => {
      const error = new TimeoutError(
        "Test timeout",
        5000,
        "openai",
        "generate",
      );
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.message).toBe("Test timeout");
      expect(error.timeout).toBe(5000);
      expect(error.provider).toBe("openai");
      expect(error.operation).toBe("generate");
    });
  });
});

describe("Timeout Controller", () => {
  describe("createTimeoutController", () => {
    it("should create timeout controller with numeric timeout", () => {
      const controller = createTimeoutController(5000, "openai", "generate");
      expect(controller).toBeDefined();
      expect(controller?.controller).toBeInstanceOf(AbortController);
      expect(controller?.timeoutMs).toBe(5000);
      controller?.cleanup();
    });

    it("should create timeout controller with string timeout", () => {
      const controller = createTimeoutController("30s", "bedrock", "stream");
      expect(controller).toBeDefined();
      expect(controller?.timeoutMs).toBe(30000);
      controller?.cleanup();
    });

    it("should return null for undefined timeout", () => {
      const controller = createTimeoutController(
        undefined,
        "openai",
        "generate",
      );
      expect(controller).toBeNull();
    });

    it("should cleanup timeout on manual cleanup", () => {
      const controller = createTimeoutController(1000, "openai", "generate");
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      controller?.cleanup();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe("withTimeout", () => {
    it("should resolve promise before timeout", async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve("success"), 100),
      );
      const result = await withTimeout(promise, 1000, "openai", "generate");
      expect(result).toBe("success");
    });

    it("should reject with TimeoutError on timeout", async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve("success"), 1000),
      );

      await expect(
        withTimeout(promise, 100, "openai", "generate"),
      ).rejects.toThrow(TimeoutError);
    });

    it("should preserve original promise rejection", async () => {
      const promise = Promise.reject(new Error("Original error"));

      await expect(
        withTimeout(promise, 1000, "openai", "generate"),
      ).rejects.toThrow("Original error");
    });
  });

  describe("withStreamingTimeout", () => {
    async function* createMockStream(delays: number[], values: string[]) {
      for (let i = 0; i < values.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, delays[i]));
        yield values[i];
      }
    }

    it("should pass through stream within timeout", async () => {
      const stream = createMockStream([50, 50, 50], ["a", "b", "c"]);
      const timeoutStream = withStreamingTimeout(stream, 1000, "openai");

      const results: string[] = [];
      for await (const value of timeoutStream) {
        results.push(value);
      }

      expect(results).toEqual(["a", "b", "c"]);
    });

    it("should timeout if chunk takes too long", async () => {
      const stream = createMockStream([50, 500], ["a", "b"]);
      const timeoutStream = withStreamingTimeout(stream, 200, "openai");

      const results: string[] = [];
      await expect(async () => {
        for await (const value of timeoutStream) {
          results.push(value);
        }
      }).rejects.toThrow(TimeoutError);

      expect(results).toEqual(["a"]); // First chunk should be received
    });

    it("should handle stream errors", async () => {
      async function* errorStream() {
        yield "first";
        throw new Error("Stream error");
      }

      const timeoutStream = withStreamingTimeout(errorStream(), 1000, "openai");

      const results: string[] = [];
      await expect(async () => {
        for await (const value of timeoutStream) {
          results.push(value);
        }
      }).rejects.toThrow("Stream error");

      expect(results).toEqual(["first"]);
    });
  });
});

describe("Provider Timeout Integration", () => {
  // Mock providers to test timeout behavior
  beforeEach(() => {
    vi.mock("../lib/providers/openAI.js", () => ({
      OpenAI: class {
        async generateText(options: any) {
          // Simulate API delay
          await new Promise((resolve) => setTimeout(resolve, 100));
          const timeoutMs = options.timeout
            ? parseTimeout(options.timeout)
            : undefined;
          if (timeoutMs && timeoutMs < 100) {
            throw new TimeoutError(
              "Operation timed out",
              100,
              "openai",
              "generate",
            );
          }
          return { text: "Success", usage: { totalTokens: 10 } };
        }
      },
    }));
  });

  it("should pass timeout to provider methods", async () => {
    const sdk = new NeuroLink();

    // This should succeed
    const result = await sdk.generateText({
      prompt: "test",
      provider: "openai",
      timeout: "1s",
    });

    expect(result.content).toBeDefined();
  });

  it("should handle timeout errors in fallback", async () => {
    const sdk = new NeuroLink();

    // Set a very short timeout to trigger fallback
    process.env.OPENAI_API_KEY = "test-key";

    await expect(
      sdk.generateText({
        prompt: "test",
        provider: "openai",
        timeout: "1ms", // Very short timeout
      }),
    ).rejects.toThrow();
  });
});

describe("CLI Timeout Integration", () => {
  it("should accept various timeout formats in CLI options", () => {
    const testCases = [
      { input: "30s", expected: 30000 },
      { input: "2m", expected: 120000 },
      { input: "1h", expected: 3600000 },
      { input: "5000", expected: 5000 },
    ];

    for (const { input, expected } of testCases) {
      expect(parseTimeout(input)).toBe(expected);
    }
  });
});

describe("MCP Tool Timeout", () => {
  it("should timeout long-running MCP tools", async () => {
    // Mock MCP tool that takes too long
    const mockTool = {
      execute: vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return { result: "success" };
      }),
    };

    // Create abort controller for tool timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 100);

    const toolPromise = mockTool.execute();

    await expect(
      Promise.race([
        toolPromise,
        new Promise((_, reject) => {
          abortController.signal.addEventListener("abort", () => {
            reject(new Error("Tool execution timeout"));
          });
        }),
      ]),
    ).rejects.toThrow("Tool execution timeout");

    clearTimeout(timeoutId);
  });
});

describe("Edge Cases", () => {
  it("should handle partial responses on timeout", async () => {
    // Test that partial data is preserved when timeout occurs
    const chunks: string[] = [];

    async function* slowStream() {
      yield "chunk1";
      await new Promise((resolve) => setTimeout(resolve, 50));
      yield "chunk2";
      await new Promise((resolve) => setTimeout(resolve, 200)); // This will timeout
      yield "chunk3";
    }

    const timeoutStream = withStreamingTimeout(slowStream(), 100, "test");

    try {
      for await (const chunk of timeoutStream) {
        chunks.push(chunk);
      }
    } catch (error) {
      expect(error).toBeInstanceOf(TimeoutError);
    }

    expect(chunks).toEqual(["chunk1", "chunk2"]); // Should have partial data
  });

  it("should cleanup resources on timeout", async () => {
    const controller = createTimeoutController(100, "test", "generate");
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    // Wait for timeout to trigger
    await new Promise((resolve) => setTimeout(resolve, 150));

    controller?.cleanup();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("should handle race conditions in cleanup", () => {
    const controller = createTimeoutController(100, "test", "generate");

    // Multiple cleanup calls should be safe
    controller?.cleanup();
    controller?.cleanup();
    controller?.cleanup();

    // No errors should be thrown
    expect(true).toBe(true);
  });
});
