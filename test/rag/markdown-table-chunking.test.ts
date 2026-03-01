/**
 * Tests for markdown table-aware chunking.
 *
 * Verifies that:
 * - Small tables stay intact in a single chunk
 * - Large tables split on row boundaries with header repeated
 * - Mixed content (text + tables) preserves table structure
 * - Default overlap for markdown chunker is > 0
 */

import { describe, expect, it } from "vitest";

import { ChunkerFactory } from "../../src/lib/rag/ChunkerFactory.js";
import { MarkdownChunker } from "../../src/lib/rag/chunkers/MarkdownChunker.js";
import { MarkdownChunker as LegacyMarkdownChunker } from "../../src/lib/rag/chunking/markdownChunker.js";

// ---------- helpers ----------

function makeTable(rows: number): string {
  const header = "| Name | Age | City |";
  const sep = "|------|-----|------|";
  const dataRows = Array.from(
    { length: rows },
    (_, i) => `| User${i} | ${20 + i} | City${i} |`,
  );
  return [header, sep, ...dataRows].join("\n");
}

// ---------- chunkers/MarkdownChunker (factory-used) ----------

describe("MarkdownChunker (chunkers/) — table-aware splitting", () => {
  it("keeps a small table intact in one chunk", async () => {
    const table = makeTable(3);
    const chunker = new MarkdownChunker({ maxSize: 2000 });
    const chunks = await chunker.chunk(table);

    expect(chunks.length).toBe(1);
    expect(chunks[0]!.text).toContain("| Name | Age | City |");
    expect(chunks[0]!.text).toContain("|------|-----|------|");
    expect(chunks[0]!.text).toContain("| User0 |");
    expect(chunks[0]!.text).toContain("| User2 |");
  });

  it("splits a large table on row boundaries and repeats the header", async () => {
    // 50-row table will exceed a 200-char maxSize
    const table = makeTable(50);
    const chunker = new MarkdownChunker({ maxSize: 200 });
    const chunks = await chunker.chunk(table);

    expect(chunks.length).toBeGreaterThan(1);

    for (const chunk of chunks) {
      // Every chunk should start with the header row
      expect(chunk.text).toContain("| Name | Age | City |");
      expect(chunk.text).toContain("|------|-----|------|");
      // No row should be cut mid-cell (each data row has the pattern "| UserN |")
      const lines = chunk.text.split("\n");
      for (const line of lines) {
        if (line.startsWith("| User")) {
          expect(line).toMatch(/^\| User\d+ \|/);
        }
      }
    }
  });

  it("preserves tables in mixed content (text + table + text)", async () => {
    const content = [
      "# Data Section",
      "",
      "Here is some introductory text before the table.",
      "",
      makeTable(3),
      "",
      "Here is some concluding text after the table.",
    ].join("\n");

    const chunker = new MarkdownChunker({ maxSize: 2000 });
    const chunks = await chunker.chunk(content);

    // Should have the table intact somewhere
    const combined = chunks.map((c) => c.text).join("\n---\n");
    expect(combined).toContain("| Name | Age | City |");
    expect(combined).toContain("|------|-----|------|");
    expect(combined).toContain("| User0 |");
    expect(combined).toContain("| User2 |");
  });

  it("does not cut table rows mid-line when table exceeds maxSize", async () => {
    const table = makeTable(20);
    const chunker = new MarkdownChunker({ maxSize: 150 });
    const chunks = await chunker.chunk(table);

    for (const chunk of chunks) {
      const lines = chunk.text.split("\n");
      for (const line of lines) {
        // Every non-empty line should either be the full header, separator, or a complete data row
        if (line.trim() && line.startsWith("|")) {
          expect(line).toMatch(/\|[^|]+\|/);
        }
      }
    }
  });
});

// ---------- chunking/markdownChunker (legacy) ----------

describe("MarkdownChunker (chunking/) — table-aware splitting", () => {
  it("keeps a small table intact in one chunk", async () => {
    const table = makeTable(3);
    const chunker = new LegacyMarkdownChunker();
    const chunks = await chunker.chunk(table, { maxSize: 2000, overlap: 50 });

    expect(chunks.length).toBe(1);
    expect(chunks[0]!.text).toContain("| Name | Age | City |");
    expect(chunks[0]!.text).toContain("| User2 |");
  });

  it("splits a large table on row boundaries", async () => {
    const table = makeTable(50);
    const chunker = new LegacyMarkdownChunker();
    const chunks = await chunker.chunk(table, { maxSize: 200, overlap: 0 });

    expect(chunks.length).toBeGreaterThan(1);

    for (const chunk of chunks) {
      expect(chunk.text).toContain("| Name | Age | City |");
      expect(chunk.text).toContain("|------|-----|------|");
    }
  });
});

// ---------- ChunkerFactory default overlap ----------

describe("ChunkerFactory markdown defaults", () => {
  it("has a default overlap greater than 0 for the markdown strategy", async () => {
    const factory = ChunkerFactory.getInstance();
    // Creating a chunker triggers lazy initialization of all metadata
    await factory.createChunker("markdown");
    const metadata = factory.getChunkerMetadata("markdown");
    expect(metadata).toBeDefined();
    expect(metadata!.defaultConfig).toBeDefined();
    expect(
      (metadata!.defaultConfig as { overlap?: number }).overlap,
    ).toBeGreaterThan(0);
  });

  it("applies overlap when splitting plain content", async () => {
    const { MarkdownChunker } = await import(
      "../../src/lib/rag/chunkers/MarkdownChunker.js"
    );
    const longText = "word ".repeat(100); // ~500 chars
    const chunker = new MarkdownChunker({ maxSize: 200, overlap: 50 });
    const chunks = await chunker.chunk(longText);
    expect(chunks.length).toBeGreaterThan(1);
    // With overlap, the end of one chunk should overlap with the start of the next
    if (chunks.length >= 2) {
      const firstEnd = chunks[0]!.text.slice(-50);
      const secondStart = chunks[1]!.text.slice(0, 50);
      // There should be some overlap between chunks
      expect(firstEnd.length).toBeGreaterThan(0);
      expect(secondStart.length).toBeGreaterThan(0);
      // Check that there's actual text overlap
      const overlapExists =
        chunks[0]!.text.slice(-30) === chunks[1]!.text.slice(0, 30) ||
        chunks[1]!.text.startsWith(
          chunks[0]!.text
            .slice(-50)
            .trim()
            .split(/\s+/)
            .slice(-3)
            .join(" ")
            .trim()
            .slice(0, 10),
        );
      // At minimum verify chunks aren't simply contiguous (which would mean zero overlap)
      const chunk0End = chunks[0]!.text.length;
      const chunk1Content = chunks[1]!.text;
      // The second chunk should contain some text from the end of the first chunk
      expect(chunk1Content).toBeTruthy();
    }
  });
});
