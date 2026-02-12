/**
 * StreamingReader Tests
 *
 * Tests for the streaming file reader with token-budget-aware line reading.
 * Covers readLines, readFromBuffer, searchInFile, readPreview, and countLines.
 */

import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { StreamingReader } from "../../../src/lib/files/streamingReader.js";

let testDir: string;
let testFile: string;
let testLines: string[];

beforeAll(async () => {
  testDir = join(tmpdir(), `neurolink-streaming-test-${randomUUID()}`);
  await mkdir(testDir, { recursive: true });

  // Create a test file with 1000 numbered lines
  testLines = Array.from(
    { length: 1000 },
    (_, i) => `Line ${i + 1}: The quick brown fox jumps over the lazy dog`,
  );
  testFile = join(testDir, "test-1000-lines.txt");
  await writeFile(testFile, testLines.join("\n"));
});

afterAll(async () => {
  try {
    await rm(testDir, { recursive: true, force: true });
  } catch {
    // Ignore
  }
});

describe("StreamingReader", () => {
  // ─── readLines ──────────────────────────────────────────────

  describe("readLines", () => {
    it("should read all lines from a small file", async () => {
      const smallFile = join(testDir, "small.txt");
      await writeFile(smallFile, "alpha\nbeta\ngamma\n");

      const result = await StreamingReader.readLines(smallFile);
      expect(result.content).toContain("alpha");
      expect(result.content).toContain("beta");
      expect(result.content).toContain("gamma");
      expect(result.totalLines).toBe(3); // readline splits on \n, trailing newline = 3 lines
      expect(result.truncated).toBe(false);
    });

    it("should read specific line range", async () => {
      const result = await StreamingReader.readLines(testFile, {
        startLine: 10,
        endLine: 15,
      });

      expect(result.content).toContain("Line 10:");
      expect(result.content).toContain("Line 15:");
      expect(result.content).not.toContain("Line 9:");
      expect(result.content).not.toContain("Line 16:");
      expect(result.startLine).toBe(10);
      expect(result.endLine).toBe(15);
    });

    it("should respect token budget and truncate", async () => {
      const result = await StreamingReader.readLines(testFile, {
        tokenBudget: 50, // Very small budget — should only get a few lines
      });

      expect(result.truncated).toBe(true);
      expect(result.estimatedTokens).toBeLessThanOrEqual(100); // Allow some slack
      expect(result.startLine).toBe(1);
      expect(result.endLine).toBeLessThan(1000);
    });

    it("should handle startLine beyond file length", async () => {
      const result = await StreamingReader.readLines(testFile, {
        startLine: 2000,
      });

      expect(result.content).toBe("");
      expect(result.truncated).toBe(false);
    });

    it("should throw for nonexistent file", async () => {
      await expect(
        StreamingReader.readLines("/nonexistent/path/file.txt"),
      ).rejects.toThrow();
    });
  });

  // ─── readFromBuffer ─────────────────────────────────────────

  describe("readFromBuffer", () => {
    it("should read all content from a small buffer", () => {
      const buffer = Buffer.from("Line 1\nLine 2\nLine 3");
      const result = StreamingReader.readFromBuffer(buffer);

      expect(result.content).toBe("Line 1\nLine 2\nLine 3");
      expect(result.totalLines).toBe(3);
      expect(result.truncated).toBe(false);
    });

    it("should read specific line range from buffer", () => {
      const buffer = Buffer.from("A\nB\nC\nD\nE");
      const result = StreamingReader.readFromBuffer(buffer, {
        startLine: 2,
        endLine: 4,
      });

      expect(result.content).toBe("B\nC\nD");
      expect(result.startLine).toBe(2);
      expect(result.endLine).toBe(4);
    });

    it("should respect token budget in buffer reading", () => {
      const lines = Array.from(
        { length: 100 },
        (_, i) => `Line ${i + 1}: content`,
      );
      const buffer = Buffer.from(lines.join("\n"));

      const result = StreamingReader.readFromBuffer(buffer, {
        tokenBudget: 20,
      });

      expect(result.truncated).toBe(true);
      expect(result.content.split("\n").length).toBeLessThan(100);
    });
  });

  // ─── countLines ─────────────────────────────────────────────

  describe("countLines", () => {
    it("should count lines in a file", async () => {
      const count = await StreamingReader.countLines(testFile);
      expect(count).toBe(1000);
    });

    it("should count lines in a small file", async () => {
      const smallFile = join(testDir, "count-test.txt");
      await writeFile(smallFile, "a\nb\nc\n");

      const count = await StreamingReader.countLines(smallFile);
      expect(count).toBe(3); // readline treats trailing newline as end-of-line, not new line
    });
  });

  // ─── searchInFile ───────────────────────────────────────────

  describe("searchInFile", () => {
    it("should find text matches in a file", async () => {
      const searchFile = join(testDir, "search-test.txt");
      await writeFile(
        searchFile,
        "apple\nbanana\ncherry\napple pie\ndate\napple sauce\n",
      );

      const result = await StreamingReader.searchInFile(searchFile, "apple");

      expect(result.totalMatches).toBe(3);
      expect(result.matches).toHaveLength(3);
      expect(result.matches[0].lineNumber).toBe(1);
      expect(result.matches[0].line).toBe("apple");
      expect(result.matches[1].lineNumber).toBe(4);
      expect(result.matches[2].lineNumber).toBe(6);
    });

    it("should support regex patterns", async () => {
      const searchFile = join(testDir, "regex-test.txt");
      await writeFile(searchFile, "foo123\nbar456\nfoo789\nbaz000\n");

      const result = await StreamingReader.searchInFile(searchFile, /foo\d+/);

      expect(result.totalMatches).toBe(2);
      expect(result.matches[0].line).toBe("foo123");
      expect(result.matches[1].line).toBe("foo789");
    });

    it("should include context lines", async () => {
      const searchFile = join(testDir, "context-test.txt");
      await writeFile(
        searchFile,
        "line1\nline2\nTARGET\nline4\nline5\nline6\n",
      );

      const result = await StreamingReader.searchInFile(searchFile, "TARGET", {
        contextLines: 2,
      });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].lineNumber).toBe(3);
      expect(result.matches[0].contextBefore).toEqual(["line1", "line2"]);
      expect(result.matches[0].contextAfter).toEqual(["line4", "line5"]);
    });

    it("should respect maxMatches limit", async () => {
      // File with many matches
      const content = Array.from({ length: 100 }, (_, i) => `match-${i}`).join(
        "\n",
      );
      const searchFile = join(testDir, "many-matches.txt");
      await writeFile(searchFile, content);

      const result = await StreamingReader.searchInFile(searchFile, "match", {
        maxMatches: 5,
      });

      expect(result.matches).toHaveLength(5);
      expect(result.totalMatches).toBe(100);
      expect(result.truncated).toBe(true);
    });

    it("should return empty matches for no results", async () => {
      const searchFile = join(testDir, "no-match.txt");
      await writeFile(searchFile, "alpha\nbeta\ngamma\n");

      const result = await StreamingReader.searchInFile(searchFile, "zzzzz");

      expect(result.matches).toHaveLength(0);
      expect(result.totalMatches).toBe(0);
      expect(result.truncated).toBe(false);
    });

    it("should escape special regex characters in string patterns", async () => {
      const searchFile = join(testDir, "special-chars.txt");
      await writeFile(
        searchFile,
        "price: $10.00\nnot a match\nprice: $20.00\n",
      );

      const result = await StreamingReader.searchInFile(
        searchFile,
        "$10.00", // Should be treated as literal string, not regex
      );

      expect(result.totalMatches).toBe(1);
      expect(result.matches[0].line).toContain("$10.00");
    });
  });

  // ─── readPreview ────────────────────────────────────────────

  describe("readPreview", () => {
    it("should read first N characters of a file", async () => {
      const preview = await StreamingReader.readPreview(testFile, 100);

      expect(preview.length).toBeLessThanOrEqual(110); // Allow some slack for line boundary
      expect(preview).toContain("Line 1:");
    });

    it("should read entire small file", async () => {
      const smallFile = join(testDir, "small-preview.txt");
      await writeFile(smallFile, "Short content");

      const preview = await StreamingReader.readPreview(smallFile, 2000);
      expect(preview).toBe("Short content");
    });
  });
});
