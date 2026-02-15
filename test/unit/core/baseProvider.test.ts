import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Tool } from "ai";
import { z } from "zod";

// Mock logger to suppress output
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    always: vi.fn(),
  },
}));

// Mock toolUtils
vi.mock("../../../src/lib/utils/toolUtils.js", () => ({
  shouldDisableBuiltinTools: vi.fn(() => true),
}));

// Mock directTools
vi.mock("../../../src/lib/agent/directTools.js", () => ({
  directAgentTools: {},
}));

// Mock TTSProcessor
vi.mock("../../../src/lib/utils/ttsProcessor.js", () => ({
  TTSProcessor: { synthesize: vi.fn() },
}));

// Mock MiddlewareFactory
vi.mock("../../../src/lib/middleware/factory.js", () => ({
  MiddlewareFactory: vi.fn().mockImplementation(() => ({
    createContext: vi.fn(),
    applyMiddleware: vi.fn((model: unknown) => model),
  })),
}));

// We need to import the BaseProvider and create a concrete subclass
import { BaseProvider } from "../../../src/lib/core/baseProvider.js";
import type { AIProviderName } from "../../../src/lib/constants/enums.js";
import type {
  EnhancedGenerateResult,
  TextGenerationOptions,
} from "../../../src/lib/types/index.js";
import type {
  StreamOptions,
  StreamResult,
} from "../../../src/lib/types/streamTypes.js";
import type { ValidationSchema } from "../../../src/lib/types/typeAliases.js";
import type { LanguageModelV1 } from "ai";

/**
 * Concrete test subclass of BaseProvider so we can test protected/private methods
 * via the public API or by exposing them.
 */
class TestProvider extends BaseProvider {
  constructor() {
    super("test-model", "openai" as AIProviderName, undefined, undefined);
  }

  protected getProviderName(): AIProviderName {
    return "openai" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return "test-model";
  }

  protected getAISDKModel(): LanguageModelV1 {
    return {} as LanguageModelV1;
  }

  protected handleProviderError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }

  protected async executeStream(
    _options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    return {
      stream: (async function* () {
        yield { content: "test" };
      })(),
    };
  }

  // Expose private applyToolFiltering via a public wrapper for testing
  public testApplyToolFiltering(
    tools: Record<string, Tool>,
    options: { toolFilter?: string[]; excludeTools?: string[] },
  ): Record<string, Tool> {
    // Access private method via bracket notation
    return (this as unknown as Record<string, Function>)["applyToolFiltering"](
      tools,
      options,
    );
  }

  // Expose getToolsForStream for testing
  public async testGetToolsForStream(
    options: StreamOptions | TextGenerationOptions,
  ): Promise<Record<string, Tool>> {
    return this.getToolsForStream(options);
  }
}

// Helper to create a mock tool
function mockTool(name: string): Tool {
  return {
    description: `Mock tool: ${name}`,
    parameters: z.object({}),
    execute: async () => `result of ${name}`,
  } as unknown as Tool;
}

describe("BaseProvider", () => {
  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider();
  });

  // ── applyToolFiltering ────────────────────────────────────────────────────

  describe("applyToolFiltering", () => {
    const tools: Record<string, Tool> = {
      readFile: mockTool("readFile"),
      writeFile: mockTool("writeFile"),
      listDir: mockTool("listDir"),
      webSearch: mockTool("webSearch"),
    };

    it("should return all tools when no filter or exclude is provided", () => {
      const result = provider.testApplyToolFiltering(tools, {});
      expect(Object.keys(result)).toHaveLength(4);
      expect(result).toEqual(tools);
    });

    it("should return all tools when filter and exclude are empty arrays", () => {
      const result = provider.testApplyToolFiltering(tools, {
        toolFilter: [],
        excludeTools: [],
      });
      expect(Object.keys(result)).toHaveLength(4);
    });

    it("should only keep whitelisted tools (toolFilter)", () => {
      const result = provider.testApplyToolFiltering(tools, {
        toolFilter: ["readFile", "writeFile"],
      });
      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toHaveProperty("readFile");
      expect(result).toHaveProperty("writeFile");
      expect(result).not.toHaveProperty("listDir");
      expect(result).not.toHaveProperty("webSearch");
    });

    it("should remove blacklisted tools (excludeTools)", () => {
      const result = provider.testApplyToolFiltering(tools, {
        excludeTools: ["webSearch"],
      });
      expect(Object.keys(result)).toHaveLength(3);
      expect(result).not.toHaveProperty("webSearch");
      expect(result).toHaveProperty("readFile");
    });

    it("should apply excludeTools after toolFilter", () => {
      const result = provider.testApplyToolFiltering(tools, {
        toolFilter: ["readFile", "writeFile", "webSearch"],
        excludeTools: ["webSearch"],
      });
      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toHaveProperty("readFile");
      expect(result).toHaveProperty("writeFile");
      expect(result).not.toHaveProperty("webSearch");
    });

    it("should return empty object when toolFilter matches nothing", () => {
      const result = provider.testApplyToolFiltering(tools, {
        toolFilter: ["nonExistent"],
      });
      expect(Object.keys(result)).toHaveLength(0);
    });

    it("should not mutate original tools object", () => {
      const original = { ...tools };
      provider.testApplyToolFiltering(tools, {
        excludeTools: ["readFile"],
      });
      expect(Object.keys(tools)).toHaveLength(Object.keys(original).length);
    });
  });

  // ── chunkPrompt (static) ──────────────────────────────────────────────────

  describe("chunkPrompt", () => {
    it("should return single chunk for small prompts", () => {
      const prompt = "Hello, world!";
      const chunks = BaseProvider.chunkPrompt(prompt);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(prompt);
    });

    it("should return single chunk when prompt equals maxChunkSize", () => {
      const prompt = "a".repeat(100);
      const chunks = BaseProvider.chunkPrompt(prompt, 100);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(prompt);
    });

    it("should chunk large prompts", () => {
      const prompt = "a".repeat(250);
      const chunks = BaseProvider.chunkPrompt(prompt, 100, 0);
      expect(chunks.length).toBeGreaterThan(1);
      // Each chunk should be at most 100 chars
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(100);
      }
      // Concatenating all chunks should cover the full prompt
      expect(chunks.join("")).toBe(prompt);
    });

    it("should include overlap between chunks", () => {
      const prompt = "a".repeat(250);
      const overlap = 20;
      const chunks = BaseProvider.chunkPrompt(prompt, 100, overlap);
      expect(chunks.length).toBeGreaterThan(1);

      // Check that consecutive chunks have overlapping content
      for (let i = 1; i < chunks.length; i++) {
        const prevEnd = chunks[i - 1].slice(-overlap);
        const currStart = chunks[i].slice(0, overlap);
        // The overlap region should match
        expect(currStart).toBe(prevEnd);
      }
    });

    it("should use default maxChunkSize of 900000", () => {
      const prompt = "a".repeat(100);
      const chunks = BaseProvider.chunkPrompt(prompt);
      // 100 chars < 900000, so single chunk
      expect(chunks).toHaveLength(1);
    });

    it("should handle empty prompt", () => {
      const chunks = BaseProvider.chunkPrompt("");
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe("");
    });

    it("should not enter infinite loop with overlap >= maxChunkSize", () => {
      // overlap of 100, maxChunkSize of 50 => overlap > maxChunkSize
      // The guard clause should ensure progress
      const prompt = "a".repeat(200);
      const chunks = BaseProvider.chunkPrompt(prompt, 50, 100);
      expect(chunks.length).toBeGreaterThan(1);
      // Should terminate (no infinite loop)
    });
  });

  // ── getToolsForStream ─────────────────────────────────────────────────────

  describe("getToolsForStream", () => {
    it("should return empty object when tools are disabled", async () => {
      const result = await provider.testGetToolsForStream({
        disableTools: true,
        input: { text: "test" },
      });
      expect(Object.keys(result)).toHaveLength(0);
    });

    it("should return tools from options when provided", async () => {
      const externalTools: Record<string, Tool> = {
        myTool: mockTool("myTool"),
      };

      const result = await provider.testGetToolsForStream({
        input: { text: "test" },
        tools: externalTools,
      });
      // Should include the external tool (may also include base tools)
      expect(result).toHaveProperty("myTool");
    });

    it("should apply tool filtering to stream tools", async () => {
      const externalTools: Record<string, Tool> = {
        allowed: mockTool("allowed"),
        blocked: mockTool("blocked"),
      };

      const result = await provider.testGetToolsForStream({
        input: { text: "test" },
        tools: externalTools,
        excludeTools: ["blocked"],
      });
      expect(result).toHaveProperty("allowed");
      expect(result).not.toHaveProperty("blocked");
    });

    it("should apply toolFilter whitelist to stream tools", async () => {
      const externalTools: Record<string, Tool> = {
        keep: mockTool("keep"),
        drop: mockTool("drop"),
      };

      const result = await provider.testGetToolsForStream({
        input: { text: "test" },
        tools: externalTools,
        toolFilter: ["keep"],
      });
      expect(result).toHaveProperty("keep");
      expect(result).not.toHaveProperty("drop");
    });
  });
});
