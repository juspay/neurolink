import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock @opentelemetry/api ---
// The mock factory must be self-contained because vi.mock is hoisted
// above all other statements. tracers.ts calls trace.getTracer() at
// module scope, so the mock must return a tracer immediately.
const mockSpan = {
  setAttribute: vi.fn(),
  setStatus: vi.fn(),
  recordException: vi.fn(),
  end: vi.fn(),
  addEvent: vi.fn(),
};

const mockTracer = {
  startActiveSpan: vi.fn(
    (
      _name: string,
      opts: Record<string, unknown> | ((_s: typeof mockSpan) => unknown),
      fn?: (_s: typeof mockSpan) => unknown,
    ) => {
      if (typeof opts === "function") {
        return opts(mockSpan);
      }
      return fn!(mockSpan);
    },
  ),
  startSpan: vi.fn(() => mockSpan),
};

vi.mock("@opentelemetry/api", () => {
  const span = {
    setAttribute: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
    addEvent: vi.fn(),
  };
  const tracer = {
    startActiveSpan: vi.fn(
      (
        _name: string,
        opts: Record<string, unknown> | ((_s: typeof span) => unknown),
        fn?: (_s: typeof span) => unknown,
      ) => {
        if (typeof opts === "function") {
          return opts(span);
        }
        return fn!(span);
      },
    ),
    startSpan: vi.fn(() => span),
  };
  return {
    trace: { getTracer: vi.fn(() => tracer) },
    SpanKind: { INTERNAL: 0, CLIENT: 3 },
    SpanStatusCode: { OK: 1, ERROR: 2 },
  };
});

// --- Imports (after mock) ---
import { tracers } from "../../../src/lib/telemetry/tracers.js";
import {
  withSpan,
  withClientSpan,
} from "../../../src/lib/telemetry/withSpan.js";
import { ATTR } from "../../../src/lib/telemetry/attributes.js";
import { SpanStatusCode, SpanKind } from "@opentelemetry/api";

// ============================================================
// tracers.ts
// ============================================================
describe("tracers", () => {
  const expectedKeys = [
    "sdk",
    "provider",
    "generation",
    "stream",
    "http",
    "mcp",
    "memory",
    "redis",
    "factory",
    "rag",
    "context",
    "middleware",
    "processor",
  ] as const;

  it("exports all expected tracer keys", () => {
    for (const key of expectedKeys) {
      expect(tracers).toHaveProperty(key);
    }
  });

  it("each key returns a valid tracer (object with startActiveSpan)", () => {
    for (const key of expectedKeys) {
      const tracer = tracers[key];
      expect(tracer).toBeDefined();
      expect(typeof tracer.startActiveSpan).toBe("function");
    }
  });
});

// ============================================================
// withSpan
// ============================================================
describe("withSpan", () => {
  // Grab the tracer that withSpan will use — it's one of the mocked tracers.
  // We use tracers.sdk since it's a known mock tracer from our vi.mock.
  let testTracer: typeof mockTracer;

  beforeEach(() => {
    testTracer = tracers.sdk as unknown as typeof mockTracer;
    // Clear call history on the span returned by startActiveSpan
    // Since the mock creates inline objects, we access them via the tracer
    testTracer.startActiveSpan.mockClear();
  });

  it("calls startActiveSpan, sets OK status, and ends span on success", async () => {
    const result = await withSpan(
      { name: "test-span", tracer: testTracer as never },
      async (span) => {
        // Verify span is provided
        expect(span).toBeDefined();
        return "ok";
      },
    );

    expect(result).toBe("ok");
    expect(testTracer.startActiveSpan).toHaveBeenCalledWith(
      "test-span",
      { kind: SpanKind.INTERNAL },
      expect.any(Function),
    );
  });

  it("sets OK status and ends span on success", async () => {
    let capturedSpan: Record<string, unknown> | null = null;

    await withSpan(
      { name: "ok-span", tracer: testTracer as never },
      async (span) => {
        capturedSpan = span as unknown as Record<string, unknown>;
        return "ok";
      },
    );

    expect(capturedSpan).not.toBeNull();
    expect(
      (capturedSpan as unknown as typeof mockSpan).setStatus,
    ).toHaveBeenCalledWith({
      code: SpanStatusCode.OK,
    });
    expect((capturedSpan as unknown as typeof mockSpan).end).toHaveBeenCalled();
  });

  it("sets ERROR status, records exception, ends span, and re-throws on failure", async () => {
    const err = new Error("boom");
    let capturedSpan: Record<string, unknown> | null = null;

    await expect(
      withSpan(
        { name: "fail-span", tracer: testTracer as never },
        async (span) => {
          capturedSpan = span as unknown as Record<string, unknown>;
          throw err;
        },
      ),
    ).rejects.toThrow("boom");

    const s = capturedSpan as unknown as typeof mockSpan;
    expect(s.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: "boom",
    });
    expect(s.recordException).toHaveBeenCalledWith(err);
    expect(s.end).toHaveBeenCalled();
  });

  it("sets attributes from options on the span", async () => {
    let capturedSpan: Record<string, unknown> | null = null;

    await withSpan(
      {
        name: "attr-span",
        tracer: testTracer as never,
        attributes: { "key.a": "value-a", "key.b": 42, "key.c": true },
      },
      async (span) => {
        capturedSpan = span as unknown as Record<string, unknown>;
        return "done";
      },
    );

    const s = capturedSpan as unknown as typeof mockSpan;
    expect(s.setAttribute).toHaveBeenCalledWith("key.a", "value-a");
    expect(s.setAttribute).toHaveBeenCalledWith("key.b", 42);
    expect(s.setAttribute).toHaveBeenCalledWith("key.c", true);
  });

  it("skips undefined attribute values", async () => {
    let capturedSpan: Record<string, unknown> | null = null;

    await withSpan(
      {
        name: "undef-span",
        tracer: testTracer as never,
        attributes: { "key.x": undefined, "key.y": "present" },
      },
      async (span) => {
        capturedSpan = span as unknown as Record<string, unknown>;
        return "done";
      },
    );

    const s = capturedSpan as unknown as typeof mockSpan;
    // setAttribute should NOT have been called with undefined
    const calls = s.setAttribute.mock.calls;
    const undefinedCall = calls.find((c: unknown[]) => c[0] === "key.x");
    expect(undefinedCall).toBeUndefined();
    expect(s.setAttribute).toHaveBeenCalledWith("key.y", "present");
  });

  it("callback receives the span and can set additional attributes", async () => {
    let capturedSpan: Record<string, unknown> | null = null;

    await withSpan(
      { name: "cb-span", tracer: testTracer as never },
      async (span) => {
        capturedSpan = span as unknown as Record<string, unknown>;
        span.setAttribute("extra.key", "extra-value");
        return "done";
      },
    );

    const s = capturedSpan as unknown as typeof mockSpan;
    expect(s.setAttribute).toHaveBeenCalledWith("extra.key", "extra-value");
  });

  it("handles non-Error thrown values", async () => {
    let capturedSpan: Record<string, unknown> | null = null;

    await expect(
      withSpan(
        { name: "string-throw", tracer: testTracer as never },
        async (span) => {
          capturedSpan = span as unknown as Record<string, unknown>;
          throw "string-error";
        },
      ),
    ).rejects.toBe("string-error");

    const s = capturedSpan as unknown as typeof mockSpan;
    expect(s.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: "string-error",
    });
    // recordException is only called for Error instances
    expect(s.recordException).not.toHaveBeenCalled();
  });
});

// ============================================================
// withClientSpan
// ============================================================
describe("withClientSpan", () => {
  let testTracer: typeof mockTracer;

  beforeEach(() => {
    testTracer = tracers.sdk as unknown as typeof mockTracer;
    testTracer.startActiveSpan.mockClear();
  });

  it("delegates to withSpan with kind=CLIENT", async () => {
    const result = await withClientSpan(
      { name: "client-span", tracer: testTracer as never },
      async () => "client-ok",
    );

    expect(result).toBe("client-ok");
    expect(testTracer.startActiveSpan).toHaveBeenCalledWith(
      "client-span",
      { kind: SpanKind.CLIENT },
      expect.any(Function),
    );
  });
});

// ============================================================
// attributes.ts
// ============================================================
describe("ATTR", () => {
  it("has all expected attribute keys", () => {
    const expectedKeys = [
      // GenAI standard
      "GEN_AI_SYSTEM",
      "GEN_AI_MODEL",
      "GEN_AI_OPERATION",
      "GEN_AI_INPUT_TOKENS",
      "GEN_AI_OUTPUT_TOKENS",
      "GEN_AI_FINISH_REASON",
      "GEN_AI_COST_USD",
      "GEN_AI_TOOL_NAME",
      "GEN_AI_TEMPERATURE",
      "GEN_AI_MAX_TOKENS",
      // NeuroLink custom
      "NL_PROVIDER",
      "NL_MODEL",
      "NL_STREAM_MODE",
      "NL_TOOL_COUNT",
      "NL_MESSAGE_COUNT",
      "NL_HAS_TOOLS",
      "NL_INPUT_LENGTH",
      "NL_OUTPUT_LENGTH",
      "NL_REQUEST_ID",
      "NL_PATH",
      "NL_HAS_MEMORY",
      "NL_COST",
      "NL_STRUCTURED_OUTPUT",
      "NL_HAS_FALLBACK",
      // MCP
      "MCP_SERVER_ID",
      "MCP_TOOL_NAME",
      "MCP_TIMEOUT_MS",
      "MCP_TRANSPORT",
      "MCP_CIRCUIT_STATE",
      // Session/Memory
      "SESSION_ID",
      "USER_ID",
      "MEMORY_TYPE",
      "MESSAGE_COUNT",
      "CONTENT_LENGTH",
      // RAG
      "RAG_FILE_COUNT",
      "RAG_STRATEGY",
      "RAG_CHUNK_SIZE",
      "RAG_TOP_K",
      "RAG_RESULT_COUNT",
      // Context
      "CONTEXT_STAGE",
      "CONTEXT_TOKENS_BEFORE",
      "CONTEXT_TOKENS_AFTER",
      // Middleware
      "MW_COUNT",
      "MW_NAMES",
    ];

    for (const key of expectedKeys) {
      expect(ATTR).toHaveProperty(key);
    }
  });

  it("values follow naming conventions", () => {
    const values = Object.values(ATTR);
    for (const val of values) {
      expect(typeof val).toBe("string");
      // Each value should use dotted namespace notation
      expect(val).toMatch(/^[a-z][a-z0-9_.]*$/);
    }

    // Verify specific namespace prefixes
    expect(ATTR.GEN_AI_SYSTEM).toMatch(/^gen_ai\./);
    expect(ATTR.NL_PROVIDER).toMatch(/^neurolink\./);
    expect(ATTR.MCP_SERVER_ID).toMatch(/^mcp\./);
    expect(ATTR.RAG_FILE_COUNT).toMatch(/^rag\./);
    expect(ATTR.CONTEXT_STAGE).toMatch(/^context\./);
    expect(ATTR.MW_COUNT).toMatch(/^middleware\./);
    expect(ATTR.SESSION_ID).toMatch(/^session\./);
    expect(ATTR.MEMORY_TYPE).toMatch(/^memory\./);
  });

  it("has no duplicate values across different keys", () => {
    const entries = Object.entries(ATTR);
    const valueToKey = new Map<string, string>();

    for (const [key, value] of entries) {
      const existingKey = valueToKey.get(value);
      expect(
        existingKey,
        `Duplicate value "${value}" found on keys "${existingKey}" and "${key}"`,
      ).toBeUndefined();
      valueToKey.set(value, key);
    }
  });
});
