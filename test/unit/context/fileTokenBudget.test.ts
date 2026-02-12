import { describe, it, expect } from "vitest";
import {
  calculateFileTokenBudget,
  shouldTruncateFile,
  FILE_READ_BUDGET_PERCENT,
  FILE_PREVIEW_CHARS,
} from "../../../src/lib/context/fileTokenBudget.js";

describe("File Token Budget", () => {
  describe("calculateFileTokenBudget", () => {
    it("should allocate 60% of remaining tokens for files", () => {
      const budget = calculateFileTokenBudget(200_000, 50_000, 64_000);
      // remaining = 200000 - 50000 - 64000 = 86000
      // budget = 86000 * 0.6 = 51600
      expect(budget).toBe(Math.floor(86_000 * FILE_READ_BUDGET_PERCENT));
    });

    it("should return 0 when no tokens remaining", () => {
      const budget = calculateFileTokenBudget(100_000, 80_000, 30_000);
      expect(budget).toBe(0);
    });

    it("should handle large context windows", () => {
      const budget = calculateFileTokenBudget(1_000_000, 100_000, 64_000);
      expect(budget).toBeGreaterThan(0);
      expect(budget).toBe(Math.floor(836_000 * FILE_READ_BUDGET_PERCENT));
    });
  });

  describe("shouldTruncateFile", () => {
    it("should skip validation for small files", () => {
      const result = shouldTruncateFile(50 * 1024, 10_000);
      expect(result.shouldTruncate).toBe(false);
    });

    it("should use preview mode for very large files", () => {
      const result = shouldTruncateFile(10 * 1024 * 1024, 100_000);
      expect(result.shouldTruncate).toBe(true);
      expect(result.previewMode).toBe(true);
      expect(result.maxChars).toBe(FILE_PREVIEW_CHARS);
    });

    it("should truncate medium files that exceed budget", () => {
      const fileSize = 500 * 1024; // 500KB
      const budget = 10_000; // 10K tokens = ~40K chars
      const result = shouldTruncateFile(fileSize, budget);
      expect(result.shouldTruncate).toBe(true);
      expect(result.previewMode).toBe(false);
      expect(result.maxChars).toBeGreaterThan(0);
    });

    it("should not truncate medium files within budget", () => {
      const fileSize = 200 * 1024; // 200KB
      const budget = 100_000; // 100K tokens = ~400K chars
      const result = shouldTruncateFile(fileSize, budget);
      expect(result.shouldTruncate).toBe(false);
    });
  });
});
