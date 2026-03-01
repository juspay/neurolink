import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: variables that need to be accessible from vi.mock factories
const {
  mockGenerateText,
  mockAddEvent,
  mockSetAttribute,
  mockSetStatus,
  mockEnd,
  mockSpan,
  getActiveSpanRef,
  mockLoggerInstance,
} = vi.hoisted(() => {
  const mockAddEvent = vi.fn();
  const mockSetAttribute = vi.fn();
  const mockSetStatus = vi.fn();
  const mockEnd = vi.fn();
  const mockRecordException = vi.fn();
  const mockSpan = {
    addEvent: mockAddEvent,
    setAttribute: mockSetAttribute,
    setStatus: mockSetStatus,
    end: mockEnd,
    recordException: mockRecordException,
  };
  // Mutable ref so tests can set activeSpan to undefined
  const activeSpanRef = { current: mockSpan as typeof mockSpan | undefined };
  const mockLoggerInstance = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    always: vi.fn(),
    shouldLog: vi.fn(() => false),
  };
  return {
    mockGenerateText: vi.fn(),
    mockAddEvent,
    mockSetAttribute,
    mockSetStatus,
    mockEnd,
    mockSpan,
    getActiveSpanRef: activeSpanRef,
    mockLoggerInstance,
  };
});

// Mock logger before importing the module under test
vi.mock("../../../../src/lib/utils/logger.js", () => ({
  logger: mockLoggerInstance,
}));

// Mock providerRetry — just call the function directly (no retry loop in tests)
vi.mock("../../../../src/lib/utils/providerRetry.js", () => ({
  withProviderRetry: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

// Mock ai SDK
vi.mock("ai", () => ({
  generateText: mockGenerateText,
  Output: { object: vi.fn(({ schema }: { schema: unknown }) => schema) },
  NoObjectGeneratedError: class NoObjectGeneratedError extends Error {
    constructor(msg = "no object generated") {
      super(msg);
      this.name = "NoObjectGeneratedError";
    }
  },
}));

// Mock OTel
vi.mock("@opentelemetry/api", () => ({
  trace: {
    getTracer: () => ({
      startActiveSpan: vi.fn(
        (
          _name: string,
          _opts: unknown,
          fn: (span: typeof mockSpan) => Promise<unknown>,
        ) => fn(mockSpan),
      ),
    }),
    getActiveSpan: () => getActiveSpanRef.current,
  },
  SpanKind: { INTERNAL: 1 },
  SpanStatusCode: { ERROR: 2 },
}));

// Mock tokenUtils
vi.mock("../../../../src/lib/utils/tokenUtils.js", () => ({
  extractTokenUsage: vi.fn((usage: Record<string, number>) => ({
    input: usage?.promptTokens ?? 0,
    output: usage?.completionTokens ?? 0,
    total: (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0),
  })),
  extractCacheCreationTokens: vi.fn(
    (meta: Record<string, unknown>) =>
      (meta?.cacheCreationInputTokens as number) ?? undefined,
  ),
  extractCacheReadTokens: vi.fn(
    (meta: Record<string, unknown>) =>
      (meta?.cacheReadInputTokens as number) ?? undefined,
  ),
  calculateCacheSavingsPercent: vi.fn(() => undefined),
}));

// Mock pricing (not used by GenerationHandler directly, but may be imported transitively)
vi.mock("../../../../src/lib/utils/pricing.js", () => ({
  calculateCost: vi.fn(() => 0),
}));

import { GenerationHandler } from "../../../../src/lib/core/modules/GenerationHandler.js";
import type { AIProviderName } from "../../../../src/lib/types/index.js";
import type { LanguageModelV1 } from "ai";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createHandler(
  overrides: {
    providerName?: AIProviderName;
    modelName?: string;
    supportsTools?: boolean;
    handleToolStorage?: ReturnType<typeof vi.fn>;
  } = {},
) {
  return new GenerationHandler(
    (overrides.providerName ?? "anthropic") as AIProviderName,
    overrides.modelName ?? "claude-sonnet-4-5-20250929",
    () => overrides.supportsTools ?? true,
    () => ({ isEnabled: false }),
    overrides.handleToolStorage ?? vi.fn().mockResolvedValue(undefined),
  );
}

function fakeModel(modelId = "claude-sonnet-4-5-20250929"): LanguageModelV1 {
  return { modelId } as unknown as LanguageModelV1;
}

function fakeGenerateResult(overrides: Record<string, unknown> = {}) {
  return {
    text: overrides.text ?? "Hello world",
    finishReason: overrides.finishReason ?? "stop",
    usage: overrides.usage ?? { promptTokens: 100, completionTokens: 50 },
    toolCalls: overrides.toolCalls ?? [],
    toolResults: overrides.toolResults ?? [],
    steps: overrides.steps ?? [],
    experimental_providerMetadata: overrides.experimental_providerMetadata,
    experimental_output: overrides.experimental_output,
    ...(overrides.providerMetadata !== undefined && {
      providerMetadata: overrides.providerMetadata,
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GenerationHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveSpanRef.current = mockSpan;
    mockGenerateText.mockReset();
  });

  // =========================================================================
  // Token usage attributes set by executeGeneration
  // =========================================================================
  describe("token usage attributes via executeGeneration", () => {
    it("sets gen_ai.usage.input_tokens and output_tokens for known model", async () => {
      const result = fakeGenerateResult({
        usage: { promptTokens: 1000, completionTokens: 500 },
      });
      mockGenerateText.mockResolvedValueOnce(result);

      const handler = createHandler();
      await handler.executeGeneration(fakeModel(), [], {}, {});

      const attrs = Object.fromEntries(
        mockSetAttribute.mock.calls.map((c: unknown[]) => [c[0], c[1]]),
      );
      expect(attrs["gen_ai.usage.input_tokens"]).toBe(1000);
      expect(attrs["gen_ai.usage.output_tokens"]).toBe(500);
    });

    it("defaults to 0 when token fields are missing", async () => {
      const result = fakeGenerateResult({ usage: {} });
      mockGenerateText.mockResolvedValueOnce(result);

      const handler = createHandler();
      await handler.executeGeneration(fakeModel(), [], {}, {});

      const attrs = Object.fromEntries(
        mockSetAttribute.mock.calls.map((c: unknown[]) => [c[0], c[1]]),
      );
      // The mock extractTokenUsage returns 0 for missing fields;
      // executeGeneration reads result.usage.promptTokens directly for span attrs
      expect(attrs["gen_ai.usage.input_tokens"]).toBe(0);
      expect(attrs["gen_ai.usage.output_tokens"]).toBe(0);
    });

    it("handles zero tokens gracefully", async () => {
      const result = fakeGenerateResult({
        usage: { promptTokens: 0, completionTokens: 0 },
      });
      mockGenerateText.mockResolvedValueOnce(result);

      const handler = createHandler();
      await handler.executeGeneration(fakeModel(), [], {}, {});

      const attrs = Object.fromEntries(
        mockSetAttribute.mock.calls.map((c: unknown[]) => [c[0], c[1]]),
      );
      expect(attrs["gen_ai.usage.input_tokens"]).toBe(0);
      expect(attrs["gen_ai.usage.output_tokens"]).toBe(0);
    });

    it("handles missing usage object gracefully", async () => {
      // Construct a result where usage is explicitly null/falsy
      // (fakeGenerateResult uses ?? so undefined falls through to defaults)
      const result = {
        text: "Hello",
        finishReason: "stop",
        usage: null,
        toolCalls: [],
        toolResults: [],
        steps: [],
      };
      mockGenerateText.mockResolvedValueOnce(result);

      const handler = createHandler();
      await handler.executeGeneration(fakeModel(), [], {}, {});

      // When usage is falsy, no token attributes are set
      const inputTokenCall = mockSetAttribute.mock.calls.find(
        (c: unknown[]) => c[0] === "gen_ai.usage.input_tokens",
      );
      expect(inputTokenCall).toBeUndefined();
    });
  });

  // =========================================================================
  // onStepFinish callback behavior
  // =========================================================================
  describe("onStepFinish callback behavior", () => {
    it("logs tool execution info via logger.info", async () => {
      let capturedOnStepFinish: (args: Record<string, unknown>) => void;
      mockGenerateText.mockImplementation(
        async (opts: Record<string, unknown>) => {
          capturedOnStepFinish =
            opts.onStepFinish as typeof capturedOnStepFinish;
          return fakeGenerateResult();
        },
      );

      const handler = createHandler();
      await handler.executeGeneration(fakeModel(), [], {}, {});

      const toolCalls = [
        { toolName: "readFile", args: { path: "/tmp/test.txt" } },
        {
          toolName: "writeFile",
          args: { path: "/tmp/out.txt", content: "data" },
        },
      ];
      const toolResults: unknown[] = [];
      capturedOnStepFinish!({
        toolCalls,
        toolResults,
        finishReason: "tool-calls",
      });

      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        "Tool execution completed",
        { toolResults, toolCalls },
      );
    });

    it("calls handleToolStorageFn with tool calls and results", async () => {
      const handleToolStorage = vi.fn().mockResolvedValue(undefined);

      let capturedOnStepFinish: (args: Record<string, unknown>) => void;
      mockGenerateText.mockImplementation(
        async (opts: Record<string, unknown>) => {
          capturedOnStepFinish =
            opts.onStepFinish as typeof capturedOnStepFinish;
          return fakeGenerateResult();
        },
      );

      const handler = createHandler({ handleToolStorage });
      await handler.executeGeneration(fakeModel(), [], {}, {});

      const toolCalls = [
        { toolName: "readFile", args: { path: "/tmp/test.txt" } },
      ];
      const toolResults = ["file content"];
      capturedOnStepFinish!({ toolCalls, toolResults, finishReason: "stop" });

      // Wait for the async handleToolStorageFn call
      await new Promise((r) => setTimeout(r, 10));

      expect(handleToolStorage).toHaveBeenCalledWith(
        toolCalls,
        toolResults,
        expect.any(Object),
        expect.any(Date),
      );
    });

    it("logs warning when handleToolStorageFn rejects", async () => {
      const handleToolStorage = vi
        .fn()
        .mockRejectedValue(new Error("storage failure"));

      let capturedOnStepFinish: (args: Record<string, unknown>) => void;
      mockGenerateText.mockImplementation(
        async (opts: Record<string, unknown>) => {
          capturedOnStepFinish =
            opts.onStepFinish as typeof capturedOnStepFinish;
          return fakeGenerateResult();
        },
      );

      const handler = createHandler({ handleToolStorage });
      await handler.executeGeneration(fakeModel(), [], {}, {});

      capturedOnStepFinish!({
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
      });

      // Wait for async rejection
      await new Promise((r) => setTimeout(r, 50));

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        "[GenerationHandler] Failed to store tool executions",
        expect.objectContaining({ error: "storage failure" }),
      );
    });

    it("does not throw when called with empty tool calls and results", async () => {
      let capturedOnStepFinish: (args: Record<string, unknown>) => void;
      mockGenerateText.mockImplementation(
        async (opts: Record<string, unknown>) => {
          capturedOnStepFinish =
            opts.onStepFinish as typeof capturedOnStepFinish;
          return fakeGenerateResult();
        },
      );

      const handler = createHandler();
      await handler.executeGeneration(fakeModel(), [], {}, {});

      expect(() => {
        capturedOnStepFinish!({
          toolCalls: [],
          toolResults: [],
          finishReason: "stop",
        });
      }).not.toThrow();

      // Should still log even with empty arrays
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        "Tool execution completed",
        { toolResults: [], toolCalls: [] },
      );
    });
  });

  // =========================================================================
  // Anthropic cache control
  // =========================================================================
  describe("Anthropic cache control annotation", () => {
    it("annotates last tool with cache_control for anthropic provider", async () => {
      let capturedTools: Record<string, unknown> | undefined;
      mockGenerateText.mockImplementation(
        async (opts: Record<string, unknown>) => {
          capturedTools = opts.tools as typeof capturedTools;
          return fakeGenerateResult();
        },
      );

      const tools = {
        readFile: { description: "Read a file", parameters: {} },
        writeFile: { description: "Write a file", parameters: {} },
        listDir: { description: "List directory", parameters: {} },
      } as Record<string, unknown>;

      const handler = createHandler({
        providerName: "anthropic" as AIProviderName,
      });
      await handler.executeGeneration(
        fakeModel(),
        [],
        tools as Record<string, never>,
        {},
      );

      expect(capturedTools).toBeDefined();
      const lastTool = capturedTools!["listDir"] as Record<string, unknown>;
      expect(lastTool.providerOptions).toEqual({
        anthropic: { cacheControl: { type: "ephemeral" } },
      });

      // Other tools should NOT have cache_control added
      const firstTool = capturedTools!["readFile"] as Record<string, unknown>;
      expect(firstTool.providerOptions).toBeUndefined();
    });

    it("annotates last tool with cache_control for bedrock provider", async () => {
      let capturedTools: Record<string, unknown> | undefined;
      mockGenerateText.mockImplementation(
        async (opts: Record<string, unknown>) => {
          capturedTools = opts.tools as typeof capturedTools;
          return fakeGenerateResult();
        },
      );

      const tools = {
        tool1: { description: "Tool 1", parameters: {} },
      } as Record<string, unknown>;

      const handler = createHandler({
        providerName: "bedrock" as AIProviderName,
      });
      await handler.executeGeneration(
        fakeModel(),
        [],
        tools as Record<string, never>,
        {},
      );

      expect(capturedTools).toBeDefined();
      const tool = capturedTools!["tool1"] as Record<string, unknown>;
      expect(tool.providerOptions).toEqual({
        anthropic: { cacheControl: { type: "ephemeral" } },
      });
    });

    it("annotates for vertex provider when model starts with claude-", async () => {
      let capturedTools: Record<string, unknown> | undefined;
      mockGenerateText.mockImplementation(
        async (opts: Record<string, unknown>) => {
          capturedTools = opts.tools as typeof capturedTools;
          return fakeGenerateResult();
        },
      );

      const tools = {
        search: { description: "Search", parameters: {} },
      } as Record<string, unknown>;

      const handler = createHandler({
        providerName: "vertex" as AIProviderName,
        modelName: "claude-sonnet-4-5@20250929",
      });
      await handler.executeGeneration(
        fakeModel("claude-sonnet-4-5@20250929"),
        [],
        tools as Record<string, never>,
        {},
      );

      expect(capturedTools).toBeDefined();
      const tool = capturedTools!["search"] as Record<string, unknown>;
      expect(tool.providerOptions).toEqual({
        anthropic: { cacheControl: { type: "ephemeral" } },
      });
    });

    it("does NOT annotate for vertex provider when model is gemini", async () => {
      let capturedTools: Record<string, unknown> | undefined;
      mockGenerateText.mockImplementation(
        async (opts: Record<string, unknown>) => {
          capturedTools = opts.tools as typeof capturedTools;
          return fakeGenerateResult();
        },
      );

      const tools = {
        search: { description: "Search", parameters: {} },
      } as Record<string, unknown>;

      const handler = createHandler({
        providerName: "vertex" as AIProviderName,
        modelName: "gemini-2.0-flash",
      });
      await handler.executeGeneration(
        fakeModel("gemini-2.0-flash"),
        [],
        tools as Record<string, never>,
        {},
      );

      if (capturedTools) {
        const tool = capturedTools["search"] as Record<string, unknown>;
        expect(tool.providerOptions).toBeUndefined();
      }
    });

    it("does NOT annotate for openai provider", async () => {
      let capturedTools: Record<string, unknown> | undefined;
      mockGenerateText.mockImplementation(
        async (opts: Record<string, unknown>) => {
          capturedTools = opts.tools as typeof capturedTools;
          return fakeGenerateResult();
        },
      );

      const tools = {
        tool1: { description: "Tool 1", parameters: {} },
      } as Record<string, unknown>;

      const handler = createHandler({
        providerName: "openai" as AIProviderName,
      });
      await handler.executeGeneration(
        fakeModel("gpt-4o"),
        [],
        tools as Record<string, never>,
        {},
      );

      if (capturedTools) {
        const tool = capturedTools["tool1"] as Record<string, unknown>;
        expect(tool.providerOptions).toBeUndefined();
      }
    });

    it("handles empty tools object without throwing", async () => {
      mockGenerateText.mockImplementation(async () => fakeGenerateResult());

      const handler = createHandler({
        providerName: "anthropic" as AIProviderName,
      });

      await expect(
        handler.executeGeneration(fakeModel(), [], {}, {}),
      ).resolves.toBeDefined();
    });
  });

  // =========================================================================
  // onStepFinish: tool storage edge cases
  // =========================================================================
  describe("onStepFinish tool storage edge cases", () => {
    it("passes tool calls and results to handleToolStorageFn", async () => {
      const handleToolStorage = vi.fn().mockResolvedValue(undefined);
      const handler = createHandler({ handleToolStorage });

      let capturedOnStepFinish: (args: Record<string, unknown>) => void;
      mockGenerateText.mockImplementation(
        async (opts: Record<string, unknown>) => {
          capturedOnStepFinish =
            opts.onStepFinish as typeof capturedOnStepFinish;
          return fakeGenerateResult();
        },
      );

      await handler.executeGeneration(fakeModel(), [], {}, {});

      const toolCalls = [{ toolName: "test", args: { x: 1 } }];
      const toolResults = ["result1"];
      capturedOnStepFinish!({
        toolCalls,
        toolResults,
        finishReason: "tool-calls",
      });

      // Wait for the async handleToolStorageFn call
      await new Promise((r) => setTimeout(r, 10));

      expect(handleToolStorage).toHaveBeenCalledWith(
        toolCalls,
        toolResults,
        expect.any(Object),
        expect.any(Date),
      );
    });

    it("logs warning when handleToolStorageFn fails", async () => {
      const handleToolStorage = vi
        .fn()
        .mockRejectedValue(new Error("storage failure"));
      const handler = createHandler({ handleToolStorage });

      let capturedOnStepFinish: (args: Record<string, unknown>) => void;
      mockGenerateText.mockImplementation(
        async (opts: Record<string, unknown>) => {
          capturedOnStepFinish =
            opts.onStepFinish as typeof capturedOnStepFinish;
          return fakeGenerateResult();
        },
      );

      await handler.executeGeneration(fakeModel(), [], {}, {});

      capturedOnStepFinish!({
        toolCalls: [],
        toolResults: [],
        finishReason: "stop",
      });

      // Wait for async rejection
      await new Promise((r) => setTimeout(r, 50));

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        "[GenerationHandler] Failed to store tool executions",
        expect.objectContaining({ error: "storage failure" }),
      );
    });

    it("handles empty tool calls and results without throwing", async () => {
      let capturedOnStepFinish: (args: Record<string, unknown>) => void;
      mockGenerateText.mockImplementation(
        async (opts: Record<string, unknown>) => {
          capturedOnStepFinish =
            opts.onStepFinish as typeof capturedOnStepFinish;
          return fakeGenerateResult();
        },
      );

      const handler = createHandler();
      await handler.executeGeneration(fakeModel(), [], {}, {});

      expect(() => {
        capturedOnStepFinish!({
          toolCalls: [],
          toolResults: [],
          finishReason: "stop",
        });
      }).not.toThrow();

      // Should log the info even with empty arrays
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        "Tool execution completed",
        { toolResults: [], toolCalls: [] },
      );
    });
  });

  // =========================================================================
  // extractToolInformation
  // =========================================================================
  describe("extractToolInformation", () => {
    it("extracts tool names from toolCalls", () => {
      const handler = createHandler();
      const result = fakeGenerateResult({
        toolCalls: [
          { toolName: "readFile", toolCallId: "tc1", args: {} },
          { toolName: "writeFile", toolCallId: "tc2", args: {} },
        ],
      });

      const info = handler.extractToolInformation(result as never);
      expect(info.toolsUsed).toContain("readFile");
      expect(info.toolsUsed).toContain("writeFile");
    });

    it("deduplicates tool names", () => {
      const handler = createHandler();
      const result = fakeGenerateResult({
        toolCalls: [
          { toolName: "readFile", toolCallId: "tc1", args: {} },
          { toolName: "readFile", toolCallId: "tc2", args: {} },
        ],
      });

      const info = handler.extractToolInformation(result as never);
      expect(
        info.toolsUsed.filter((n: string) => n === "readFile"),
      ).toHaveLength(1);
    });

    it("extracts tool executions from steps", () => {
      const handler = createHandler();
      const result = fakeGenerateResult({
        steps: [
          {
            toolCalls: [
              {
                toolName: "search",
                toolCallId: "tc1",
                args: { query: "test" },
              },
            ],
            toolResults: [
              {
                toolName: "search",
                toolCallId: "tc1",
                result: { data: "found it" },
              },
            ],
          },
        ],
      });

      const info = handler.extractToolInformation(result as never);
      expect(info.toolExecutions).toHaveLength(1);
      expect(info.toolExecutions[0].name).toBe("search");
      expect(info.toolExecutions[0].output).toEqual({ data: "found it" });
    });

    it("handles empty steps and toolCalls", () => {
      const handler = createHandler();
      const result = fakeGenerateResult({ toolCalls: [], steps: [] });

      const info = handler.extractToolInformation(result as never);
      expect(info.toolsUsed).toEqual([]);
      expect(info.toolExecutions).toEqual([]);
    });

    it("falls back to name field when toolName is missing", () => {
      const handler = createHandler();
      const result = fakeGenerateResult({
        toolCalls: [{ name: "legacyTool", args: {} }],
      });

      const info = handler.extractToolInformation(result as never);
      expect(info.toolsUsed).toContain("legacyTool");
    });

    it("uses input field as args when args/arguments/parameters missing", () => {
      const handler = createHandler();
      const result = fakeGenerateResult({
        steps: [
          {
            toolCalls: [{ toolName: "myTool", toolCallId: "tc1", args: {} }],
            toolResults: [
              {
                toolName: "myTool",
                toolCallId: "tc1",
                input: { key: "val" },
                result: "ok",
              },
            ],
          },
        ],
      });

      const info = handler.extractToolInformation(result as never);
      expect(info.toolExecutions[0].input).toEqual({ key: "val" });
    });
  });

  // =========================================================================
  // formatEnhancedResult
  // =========================================================================
  describe("formatEnhancedResult", () => {
    it("returns correct structure with content and usage", () => {
      const handler = createHandler();
      const genResult = fakeGenerateResult({
        text: "The answer is 42",
        usage: { promptTokens: 200, completionTokens: 100 },
      });

      const result = handler.formatEnhancedResult(
        genResult as never,
        {},
        ["tool1"],
        [{ name: "tool1", input: {}, output: "ok" }],
        {},
      );

      expect(result.content).toBe("The answer is 42");
      expect(result.provider).toBe("anthropic");
      expect(result.model).toBe("claude-sonnet-4-5-20250929");
      expect(result.toolsUsed).toEqual(["tool1"]);
      expect(result.toolExecutions).toHaveLength(1);
    });

    it("handles structured output with experimental_output", () => {
      const handler = createHandler();
      const genResult = fakeGenerateResult({
        experimental_output: { key: "value", count: 42 },
      });

      const result = handler.formatEnhancedResult(
        genResult as never,
        {},
        [],
        [],
        {
          schema: {} as never,
          output: { format: "json" },
        },
      );

      expect(result.content).toBe(JSON.stringify({ key: "value", count: 42 }));
    });

    it("strips markdown code fences for structured output fallback", () => {
      const handler = createHandler();
      const genResult = fakeGenerateResult({
        text: '```json\n{"answer": 42}\n```',
        experimental_output: undefined,
      });

      const result = handler.formatEnhancedResult(
        genResult as never,
        {},
        [],
        [],
        {
          schema: {} as never,
          output: { format: "json" },
        },
      );

      expect(result.content).toBe('{"answer": 42}');
    });

    it("maps availableTools with description and server", () => {
      const handler = createHandler();
      const genResult = fakeGenerateResult();
      const tools = {
        myTool: {
          description: "A cool tool",
          parameters: { type: "object" },
          serverId: "github",
        },
      };

      const result = handler.formatEnhancedResult(
        genResult as never,
        tools as never,
        [],
        [],
        {},
      );

      expect(result.availableTools).toHaveLength(1);
      expect(result.availableTools[0]).toEqual({
        name: "myTool",
        description: "A cool tool",
        parameters: { type: "object" },
        server: "github",
      });
    });

    it("defaults server to 'direct' when serverId is missing", () => {
      const handler = createHandler();
      const genResult = fakeGenerateResult();
      const tools = {
        localTool: { description: "Local tool", parameters: {} },
      };

      const result = handler.formatEnhancedResult(
        genResult as never,
        tools as never,
        [],
        [],
        {},
      );

      expect(result.availableTools[0].server).toBe("direct");
    });

    it("handles experimental_output getter throwing", () => {
      const handler = createHandler();
      const genResult = fakeGenerateResult({ text: '{"fallback": true}' });
      // Simulate experimental_output throwing NoObjectGeneratedError
      Object.defineProperty(genResult, "experimental_output", {
        get() {
          throw new Error("NoObjectGeneratedError");
        },
      });

      const result = handler.formatEnhancedResult(
        genResult as never,
        {},
        [],
        [],
        {
          schema: {} as never,
          output: { format: "json" },
        },
      );

      // Should fall back to text
      expect(result.content).toBe('{"fallback": true}');
    });
  });

  // =========================================================================
  // Cache metrics extraction
  // =========================================================================
  describe("cache metrics extraction (via logGenerationComplete)", () => {
    it("extracts cache metrics from providerMetadata.anthropic", () => {
      const handler = createHandler();
      // Enable debug logging so the shouldLog guard passes
      mockLoggerInstance.shouldLog.mockReturnValue(true);
      const genResult = fakeGenerateResult({
        providerMetadata: {
          anthropic: {
            cacheCreationInputTokens: 500,
            cacheReadInputTokens: 300,
          },
        },
      });

      handler.logGenerationComplete(genResult as never);
      expect(mockLoggerInstance.debug).toHaveBeenCalled();
      // Restore default
      mockLoggerInstance.shouldLog.mockReturnValue(false);
    });

    it("handles missing providerMetadata gracefully", () => {
      const handler = createHandler();
      const genResult = fakeGenerateResult();

      expect(() =>
        handler.logGenerationComplete(genResult as never),
      ).not.toThrow();
    });

    it("handles experimental_providerMetadata fallback", () => {
      const handler = createHandler();
      const genResult = fakeGenerateResult({
        experimental_providerMetadata: {
          anthropic: {
            cacheCreationInputTokens: 100,
            cacheReadInputTokens: 200,
          },
        },
      });

      expect(() =>
        handler.logGenerationComplete(genResult as never),
      ).not.toThrow();
    });
  });

  // =========================================================================
  // analyzeAIResponse
  // =========================================================================
  describe("analyzeAIResponse", () => {
    it("logs response analysis with tool call details", () => {
      const handler = createHandler();

      handler.analyzeAIResponse({
        text: "Hello",
        finishReason: "stop",
        usage: { promptTokens: 50, completionTokens: 25 },
        toolCalls: [
          {
            toolName: "search",
            toolCallId: "tc1",
            args: { query: "test" },
          },
        ],
      });

      expect(mockLoggerInstance.debug).toHaveBeenCalledWith(
        "NeuroLink Raw AI Response Analysis",
        expect.objectContaining({
          responseTextLength: 5,
          finishReason: "stop",
        }),
      );

      expect(mockLoggerInstance.debug).toHaveBeenCalledWith(
        "Tool Calls Analysis",
        expect.objectContaining({
          hasToolCalls: true,
          toolCallsLength: 1,
        }),
      );
    });

    it("handles response with no tool calls", () => {
      const handler = createHandler();

      handler.analyzeAIResponse({
        text: "Simple response",
        finishReason: "stop",
        usage: {},
      });

      expect(mockLoggerInstance.debug).toHaveBeenCalledWith(
        "Tool Calls Analysis",
        expect.objectContaining({
          hasToolCalls: false,
          toolCallsLength: 0,
        }),
      );
    });

    it("handles missing text gracefully", () => {
      const handler = createHandler();

      expect(() =>
        handler.analyzeAIResponse({
          finishReason: "stop",
          usage: {},
        }),
      ).not.toThrow();

      expect(mockLoggerInstance.debug).toHaveBeenCalledWith(
        "NeuroLink Raw AI Response Analysis",
        expect.objectContaining({ responseTextLength: 0 }),
      );
    });
  });

  // =========================================================================
  // executeGeneration span attributes
  // =========================================================================
  describe("executeGeneration span attributes", () => {
    it("sets core span attributes", async () => {
      mockGenerateText.mockResolvedValueOnce(fakeGenerateResult());

      const handler = createHandler();
      await handler.executeGeneration(
        fakeModel(),
        [{ role: "user", content: "Hello" }] as never,
        {},
        {},
      );

      const attrs = Object.fromEntries(
        mockSetAttribute.mock.calls.map((c: unknown[]) => [c[0], c[1]]),
      );

      expect(attrs["gen_ai.system"]).toBe("anthropic");
      expect(attrs["neurolink.message_count"]).toBe(1);
      expect(attrs["gen_ai.request.model"]).toBe("claude-sonnet-4-5-20250929");
    });

    it("sets usage token attributes", async () => {
      mockGenerateText.mockResolvedValueOnce(
        fakeGenerateResult({
          usage: { promptTokens: 500, completionTokens: 200 },
        }),
      );

      const handler = createHandler();
      await handler.executeGeneration(fakeModel(), [], {}, {});

      const attrs = Object.fromEntries(
        mockSetAttribute.mock.calls.map((c: unknown[]) => [c[0], c[1]]),
      );

      expect(attrs["gen_ai.usage.input_tokens"]).toBe(500);
      expect(attrs["gen_ai.usage.output_tokens"]).toBe(200);
    });

    it("sets finish reason on span", async () => {
      mockGenerateText.mockResolvedValueOnce(
        fakeGenerateResult({ finishReason: "length" }),
      );

      const handler = createHandler();
      await handler.executeGeneration(fakeModel(), [], {}, {});

      const attrs = Object.fromEntries(
        mockSetAttribute.mock.calls.map((c: unknown[]) => [c[0], c[1]]),
      );

      expect(attrs["gen_ai.response.finish_reason"]).toBe("length");
    });

    it("sets error status on span when generation throws", async () => {
      const err = new Error("API rate limited");
      mockGenerateText.mockRejectedValueOnce(err);

      const handler = createHandler();
      await expect(
        handler.executeGeneration(fakeModel(), [], {}, {}),
      ).rejects.toThrow("API rate limited");

      expect(mockSetStatus).toHaveBeenCalledWith({
        code: 2, // SpanStatusCode.ERROR
        message: "API rate limited",
      });
      expect(mockEnd).toHaveBeenCalled();
    });

    it("sets structured_output and tool_count attributes", async () => {
      mockGenerateText.mockResolvedValueOnce(fakeGenerateResult());

      const tools = {
        toolA: { description: "Tool A", parameters: {} },
        toolB: { description: "Tool B", parameters: {} },
      };

      const handler = createHandler();
      await handler.executeGeneration(
        fakeModel(),
        [
          { role: "system", content: "You are helpful" },
          { role: "user", content: "What is 2+2?" },
        ] as never,
        tools as Record<string, never>,
        {},
      );

      const attrs = Object.fromEntries(
        mockSetAttribute.mock.calls.map((c: unknown[]) => [c[0], c[1]]),
      );

      expect(attrs["neurolink.structured_output"]).toBe(false);
      expect(attrs["neurolink.tool_count"]).toBe(2);
      expect(attrs["neurolink.message_count"]).toBe(2);
    });
  });

  // =========================================================================
  // disableTools behavior
  // =========================================================================
  describe("disableTools option", () => {
    it("does not pass tools when disableTools is true", async () => {
      let capturedOpts: Record<string, unknown> | undefined;
      mockGenerateText.mockImplementation(
        async (opts: Record<string, unknown>) => {
          capturedOpts = opts;
          return fakeGenerateResult();
        },
      );

      const tools = {
        myTool: { description: "A tool", parameters: {} },
      } as Record<string, unknown>;

      const handler = createHandler();
      await handler.executeGeneration(
        fakeModel(),
        [],
        tools as Record<string, never>,
        { disableTools: true },
      );

      expect(capturedOpts!.tools).toBeUndefined();
    });

    it("does not pass tools when supportsTools returns false", async () => {
      let capturedOpts: Record<string, unknown> | undefined;
      mockGenerateText.mockImplementation(
        async (opts: Record<string, unknown>) => {
          capturedOpts = opts;
          return fakeGenerateResult();
        },
      );

      const tools = {
        myTool: { description: "A tool", parameters: {} },
      } as Record<string, unknown>;

      const handler = createHandler({ supportsTools: false });
      await handler.executeGeneration(
        fakeModel(),
        [],
        tools as Record<string, never>,
        {},
      );

      expect(capturedOpts!.tools).toBeUndefined();
    });
  });

  // =========================================================================
  // safePreview behavior (via debug logging paths)
  // =========================================================================
  describe("safePreview behavior via debug logging", () => {
    it("does not throw on large multimodal content when debug enabled", async () => {
      mockLoggerInstance.shouldLog.mockReturnValue(true);
      mockGenerateText.mockResolvedValueOnce(
        fakeGenerateResult({ text: "ok" }),
      );

      const handler = createHandler();
      const messages = [
        {
          role: "user",
          content: [{ type: "text", text: "x".repeat(1000) }],
        },
      ];

      await expect(
        handler.executeGeneration(fakeModel(), messages as never, {}, {}),
      ).resolves.toBeDefined();
    });

    it("handles empty content in messages", async () => {
      mockLoggerInstance.shouldLog.mockReturnValue(true);
      mockGenerateText.mockResolvedValueOnce(fakeGenerateResult());

      const handler = createHandler();
      const messages = [{ role: "user", content: "" }];

      await expect(
        handler.executeGeneration(fakeModel(), messages as never, {}, {}),
      ).resolves.toBeDefined();
    });
  });
});
