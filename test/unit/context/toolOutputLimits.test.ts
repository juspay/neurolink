import { describe, it, expect } from "vitest";
import {
  truncateToolOutput,
  MAX_TOOL_OUTPUT_LINES,
} from "../../../src/lib/context/toolOutputLimits.js";

describe("Tool Output Limits", () => {
  it("should not truncate small outputs", () => {
    const result = truncateToolOutput("Hello, world!");
    expect(result.truncated).toBe(false);
    expect(result.content).toBe("Hello, world!");
  });

  it("should truncate outputs exceeding byte limit", () => {
    const largeOutput = "x".repeat(100 * 1024); // 100KB
    const result = truncateToolOutput(largeOutput);
    expect(result.truncated).toBe(true);
    expect(result.content.length).toBeLessThan(largeOutput.length);
    expect(result.content).toContain("[Output truncated");
  });

  it("should truncate outputs exceeding line limit", () => {
    const manyLines = Array.from({ length: 5000 }, (_, i) => `Line ${i}`).join(
      "\n",
    );
    const result = truncateToolOutput(manyLines);
    expect(result.truncated).toBe(true);
    expect(result.content.split("\n").length).toBeLessThanOrEqual(
      MAX_TOOL_OUTPUT_LINES + 5,
    ); // +5 for notice
  });

  it("should support head direction", () => {
    const manyLines = Array.from({ length: 3000 }, (_, i) => `Line ${i}`).join(
      "\n",
    );
    const result = truncateToolOutput(manyLines, {
      direction: "head",
      maxLines: 100,
    });
    expect(result.truncated).toBe(true);
    expect(result.content).toContain("Line 0");
    expect(result.content).toContain("[Output truncated");
  });

  it("should support tail direction (default)", () => {
    const manyLines = Array.from({ length: 3000 }, (_, i) => `Line ${i}`).join(
      "\n",
    );
    const result = truncateToolOutput(manyLines, {
      direction: "tail",
      maxLines: 100,
    });
    expect(result.truncated).toBe(true);
    expect(result.content).toContain("Line 2999");
  });

  it("should report original size", () => {
    const content = "x".repeat(100_000);
    const result = truncateToolOutput(content);
    expect(result.originalSize).toBe(100_000);
  });

  it("should respect custom maxBytes", () => {
    const content = "x".repeat(10_000);
    const result = truncateToolOutput(content, { maxBytes: 5_000 });
    expect(result.truncated).toBe(true);
  });

  it("should respect custom maxLines", () => {
    const lines = Array.from({ length: 100 }, (_, i) => `Line ${i}`).join("\n");
    const result = truncateToolOutput(lines, { maxLines: 50 });
    expect(result.truncated).toBe(true);
  });
});
