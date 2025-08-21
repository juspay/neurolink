import { describe, it, expect, vi } from "vitest";
import { createAnalyticsMiddleware } from "../src/lib/middleware/builtin/analytics.js";
import { MiddlewareFactory } from "../src/lib/middleware/factory.js";
import type { MiddlewareContext } from "../src/lib/middleware/types.js";

// Mock the AI SDK types for testing
vi.mock("ai", () => ({
  LanguageModelV1Middleware: {},
}));

describe("Basic Middleware Integration", () => {
  it("should create analytics middleware", () => {
    const analyticsMiddleware = createAnalyticsMiddleware();

    expect(analyticsMiddleware.metadata.id).toBe("analytics");
    expect(analyticsMiddleware.metadata.name).toBe("Analytics Tracking");
    expect(analyticsMiddleware.metadata.priority).toBe(100);
  });

  it("should create middleware context", () => {
    const context = MiddlewareFactory.createContext(
      "openai",
      "gpt-4",
      { prompt: "test" },
      { sessionId: "test-session" },
    );

    expect(context.provider).toBe("openai");
    expect(context.model).toBe("gpt-4");
    expect(context.options).toEqual({ prompt: "test" });
    expect(context.session?.sessionId).toBe("test-session");
  });

  it("should create middleware function", () => {
    const analyticsMiddleware = createAnalyticsMiddleware();

    expect(analyticsMiddleware).toBeDefined();
    expect(typeof analyticsMiddleware.wrapGenerate).toBe("function");
    expect(typeof analyticsMiddleware.wrapStream).toBe("function");
  });

  it("should track analytics in middleware", async () => {
    const analyticsMiddleware = createAnalyticsMiddleware();

    // Mock the doGenerate function
    const mockResult = {
      text: "Hello, world!",
      usage: {
        promptTokens: 10,
        completionTokens: 5,
      },
    };

    const mockDoGenerate = vi.fn().mockResolvedValue(mockResult);

    // Create a mock args object that satisfies TypeScript
    const mockArgs = {
      doGenerate: mockDoGenerate,
      params: { prompt: "test" },
      // These are mocked to satisfy the type system
      model: {} as unknown,
      doStream: vi.fn().mockResolvedValue({
        stream: {} as unknown,
        rawCall: { rawPrompt: {}, rawSettings: {} },
      }),
    };

    // Use type assertion to bypass type checking for the test
    const result = await (analyticsMiddleware.wrapGenerate as Function)(
      mockArgs,
    );

    expect(mockDoGenerate).toHaveBeenCalled();
    expect(result.text).toBe("Hello, world!");
  });
});
