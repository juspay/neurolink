/**
 * FileReferenceRegistry Tests
 *
 * Tests for the file reference registry that manages lazy on-demand file processing.
 * Covers registration, size tiers, previews, reading, searching, eviction, and cleanup.
 */

import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileReferenceRegistry } from "../../../src/lib/files/fileReferenceRegistry.js";
import type { FileReference } from "../../../src/lib/files/types.js";

// Helper to create a text buffer of specified size
function makeTextBuffer(sizeBytes: number): Buffer {
  const line = "The quick brown fox jumps over the lazy dog.\n";
  const repeats = Math.ceil(sizeBytes / line.length);
  return Buffer.from(line.repeat(repeats).substring(0, sizeBytes));
}

// Helper to create a binary buffer with a specific header
function makePngBuffer(sizeBytes: number = 1000): Buffer {
  const buf = Buffer.alloc(sizeBytes);
  // PNG magic bytes
  buf[0] = 0x89;
  buf[1] = 0x50;
  buf[2] = 0x4e;
  buf[3] = 0x47;
  buf[4] = 0x0d;
  buf[5] = 0x0a;
  buf[6] = 0x1a;
  buf[7] = 0x0a;
  return buf;
}

function makePdfBuffer(sizeBytes: number = 1000): Buffer {
  const buf = Buffer.alloc(sizeBytes);
  buf.write("%PDF-1.4", 0);
  return buf;
}

describe("FileReferenceRegistry", () => {
  let registry: FileReferenceRegistry;
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `neurolink-test-${randomUUID()}`);
    registry = new FileReferenceRegistry({
      tempDir,
      maxFiles: 10,
      defaultPreviewChars: 200,
    });
  });

  afterEach(async () => {
    await registry.clear();
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ─── Registration ─────────────────────────────────────────────

  describe("register", () => {
    it("should register a text buffer and return a FileReference", async () => {
      const buffer = Buffer.from("Hello, world!\nSecond line.\nThird line.");
      const ref = await registry.register(buffer, "buffer", {
        filename: "hello.txt",
      });

      expect(ref).toBeDefined();
      expect(ref.id).toBeDefined();
      expect(ref.filename).toBe("hello.txt");
      expect(ref.sizeBytes).toBe(buffer.length);
      expect(ref.detectedType).toBe("text");
      expect(ref.sizeTier).toBe("tiny");
      expect(ref.status).toBe("processed"); // tiny files are processed inline
      expect(ref.preview).toContain("Hello, world!");
      expect(ref.estimatedTokens).toBeGreaterThan(0);
    });

    it("should register a PNG buffer and detect image type", async () => {
      const buffer = makePngBuffer(5000);
      const ref = await registry.register(buffer, "buffer", {
        filename: "photo.png",
      });

      expect(ref.detectedType).toBe("image");
      expect(ref.mimeType).toBe("image/png");
      expect(ref.estimatedTokens).toBe(1500); // Image fixed estimate
    });

    it("should register a PDF buffer and detect type", async () => {
      const buffer = makePdfBuffer(50_000);
      const ref = await registry.register(buffer, "buffer", {
        filename: "report.pdf",
      });

      expect(ref.detectedType).toBe("pdf");
      expect(ref.sizeTier).toBe("small");
    });

    it("should allow overriding file type", async () => {
      const buffer = Buffer.from("some content");
      const ref = await registry.register(buffer, "buffer", {
        filename: "data.parquet",
        fileType: "unknown",
      });

      expect(ref.detectedType).toBe("unknown");
    });

    it("should reject files larger than 2GB", async () => {
      // We can't actually create a 2GB+ buffer in tests, but we can test the logic
      // by checking the error message format
      const registry2 = new FileReferenceRegistry({ tempDir });
      // Create a buffer and mock its length
      const smallBuf = Buffer.from("test");
      Object.defineProperty(smallBuf, "length", {
        value: 3 * 1024 * 1024 * 1024,
      });

      await expect(registry2.register(smallBuf, "buffer")).rejects.toThrow(
        "File too large",
      );
    });
  });

  // ─── Size Tiers ───────────────────────────────────────────────

  describe("size tier classification", () => {
    it("should classify tiny files (< 10KB)", () => {
      expect(FileReferenceRegistry.classifySizeTier(100)).toBe("tiny");
      expect(FileReferenceRegistry.classifySizeTier(5000)).toBe("tiny");
      expect(FileReferenceRegistry.classifySizeTier(10 * 1024)).toBe("tiny");
    });

    it("should classify small files (10KB-100KB)", () => {
      expect(FileReferenceRegistry.classifySizeTier(11 * 1024)).toBe("small");
      expect(FileReferenceRegistry.classifySizeTier(50 * 1024)).toBe("small");
      expect(FileReferenceRegistry.classifySizeTier(100 * 1024)).toBe("small");
    });

    it("should classify medium files (100KB-5MB)", () => {
      expect(FileReferenceRegistry.classifySizeTier(101 * 1024)).toBe("medium");
      expect(FileReferenceRegistry.classifySizeTier(1024 * 1024)).toBe(
        "medium",
      );
      expect(FileReferenceRegistry.classifySizeTier(5 * 1024 * 1024)).toBe(
        "medium",
      );
    });

    it("should classify large files (5MB-100MB)", () => {
      expect(FileReferenceRegistry.classifySizeTier(5 * 1024 * 1024 + 1)).toBe(
        "large",
      );
      expect(FileReferenceRegistry.classifySizeTier(50 * 1024 * 1024)).toBe(
        "large",
      );
      expect(FileReferenceRegistry.classifySizeTier(100 * 1024 * 1024)).toBe(
        "large",
      );
    });

    it("should classify huge files (100MB-2GB)", () => {
      expect(FileReferenceRegistry.classifySizeTier(101 * 1024 * 1024)).toBe(
        "huge",
      );
      expect(FileReferenceRegistry.classifySizeTier(1024 * 1024 * 1024)).toBe(
        "huge",
      );
    });

    it("should classify oversized files (>2GB)", () => {
      expect(
        FileReferenceRegistry.classifySizeTier(2.1 * 1024 * 1024 * 1024),
      ).toBe("oversized");
    });
  });

  // ─── Previews ─────────────────────────────────────────────────

  describe("previews", () => {
    it("should generate text preview for text files", async () => {
      const content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
      const ref = await registry.register(Buffer.from(content), "buffer", {
        filename: "test.txt",
      });

      expect(ref.preview).toContain("Line 1");
    });

    it("should truncate preview for large text files", async () => {
      const registry2 = new FileReferenceRegistry({
        tempDir,
        defaultPreviewChars: 50,
      });
      const content = "A".repeat(200);
      const ref = await registry2.register(Buffer.from(content), "buffer", {
        filename: "big.txt",
      });

      expect(ref.preview.length).toBeLessThanOrEqual(70); // 50 + "[truncated]" suffix
      await registry2.clear();
    });

    it("should generate metadata preview for binary files", async () => {
      const buffer = makePngBuffer(150_000);
      const ref = await registry.register(buffer, "buffer", {
        filename: "photo.png",
      });

      expect(ref.preview).toContain("Image file");
      expect(ref.preview).toContain("MB");
    });
  });

  // ─── List and Get ─────────────────────────────────────────────

  describe("list and get", () => {
    it("should list all registered files", async () => {
      await registry.register(Buffer.from("file1"), "buffer", {
        filename: "a.txt",
      });
      await registry.register(Buffer.from("file2"), "buffer", {
        filename: "b.txt",
      });

      const files = registry.list();
      expect(files).toHaveLength(2);
      expect(files.map((f) => f.filename)).toContain("a.txt");
      expect(files.map((f) => f.filename)).toContain("b.txt");
    });

    it("should get a file by ID", async () => {
      const ref = await registry.register(Buffer.from("content"), "buffer", {
        filename: "test.txt",
      });

      const retrieved = registry.get(ref.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.filename).toBe("test.txt");
    });

    it("should return undefined for unknown ID", () => {
      expect(registry.get("nonexistent")).toBeUndefined();
    });

    it("should update lastAccessedAt on get", async () => {
      const ref = await registry.register(Buffer.from("content"), "buffer", {
        filename: "test.txt",
      });

      const originalAccess = ref.lastAccessedAt;

      // Wait a bit
      await new Promise((r) => setTimeout(r, 10));

      const retrieved = registry.get(ref.id);
      expect(retrieved!.lastAccessedAt).toBeGreaterThanOrEqual(originalAccess);
    });

    it("should generate formatted table", async () => {
      await registry.register(Buffer.from("data"), "buffer", {
        filename: "test.csv",
      });

      const formatted = registry.listFormatted();
      expect(formatted).toContain("test.csv");
      expect(formatted).toContain("Filename");
      expect(formatted).toContain("Type");
    });
  });

  // ─── Reading and Searching ────────────────────────────────────

  describe("readSection", () => {
    it("should read a section from a tiny file (inline content)", async () => {
      const content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
      const ref = await registry.register(Buffer.from(content), "buffer", {
        filename: "test.txt",
      });

      const result = await registry.readSection(ref.id, 2, 4);
      expect(result.content).toContain("Line 2");
      expect(result.content).toContain("Line 3");
      expect(result.content).toContain("Line 4");
      expect(result.startLine).toBe(2);
    });

    it("should read from a medium file persisted to temp", async () => {
      // Create a 200KB file to trigger temp persistence
      const buffer = makeTextBuffer(200 * 1024);
      const ref = await registry.register(buffer, "buffer", {
        filename: "medium.txt",
      });

      expect(ref.tempPath).toBeDefined();
      expect(ref.sizeTier).toBe("medium");

      const result = await registry.readSection(ref.id, 1, 10, 5000);
      expect(result.content).toBeTruthy();
      expect(result.startLine).toBe(1);
      expect(result.totalLines).toBeGreaterThan(0);
    });

    it("should respect token budget", async () => {
      const buffer = makeTextBuffer(200 * 1024);
      const ref = await registry.register(buffer, "buffer", {
        filename: "large.txt",
      });

      // Very small token budget — should truncate
      const result = await registry.readSection(ref.id, 1, undefined, 100);
      expect(result.truncated).toBe(true);
      expect(result.estimatedTokens).toBeLessThanOrEqual(200); // Allow some slack
    });

    it("should throw for unknown file ID", async () => {
      await expect(registry.readSection("nonexistent")).rejects.toThrow(
        "File reference not found",
      );
    });
  });

  describe("search", () => {
    it("should find matches in a tiny file (in-memory search)", async () => {
      const content = "alpha\nbeta\ngamma\nalpha beta\ndelta\nalpha gamma";
      const ref = await registry.register(Buffer.from(content), "buffer", {
        filename: "searchable.txt",
      });

      const result = await registry.search(ref.id, "alpha");
      expect(result.totalMatches).toBe(3);
      expect(result.matches[0].line).toContain("alpha");
    });

    it("should find matches in a medium file (streaming search)", async () => {
      // Create a file large enough to trigger temp persistence
      const lines = [
        "alpha",
        "beta",
        "gamma",
        "alpha beta",
        "delta",
        "alpha gamma",
      ];
      const filler = Array.from({ length: 5000 }, (_, i) => `filler line ${i}`);
      const allLines = [...lines, ...filler];
      const buffer = Buffer.from(allLines.join("\n"));
      const ref = await registry.register(buffer, "buffer", {
        filename: "medium-searchable.txt",
      });

      expect(ref.tempPath).toBeDefined();
      const result = await registry.search(ref.id, "alpha");
      expect(result.totalMatches).toBe(3);
      expect(result.matches[0].line).toContain("alpha");
    });

    it("should throw for unknown file ID", async () => {
      await expect(registry.search("nonexistent", "pattern")).rejects.toThrow(
        "File reference not found",
      );
    });
  });

  // ─── Eviction ─────────────────────────────────────────────────

  describe("LRU eviction", () => {
    it("should evict oldest file when maxFiles is reached", async () => {
      // Registry with maxFiles=3
      const smallRegistry = new FileReferenceRegistry({
        tempDir,
        maxFiles: 3,
      });

      const ref1 = await smallRegistry.register(
        Buffer.from("file1"),
        "buffer",
        {
          filename: "first.txt",
        },
      );
      await smallRegistry.register(Buffer.from("file2"), "buffer", {
        filename: "second.txt",
      });
      await smallRegistry.register(Buffer.from("file3"), "buffer", {
        filename: "third.txt",
      });

      expect(smallRegistry.size).toBe(3);

      // Adding a 4th should evict the oldest (first)
      await smallRegistry.register(Buffer.from("file4"), "buffer", {
        filename: "fourth.txt",
      });

      expect(smallRegistry.size).toBe(3);
      expect(smallRegistry.get(ref1.id)).toBeUndefined();

      await smallRegistry.clear();
    });
  });

  // ─── Remove and Clear ────────────────────────────────────────

  describe("remove and clear", () => {
    it("should remove a file reference", async () => {
      const ref = await registry.register(Buffer.from("data"), "buffer", {
        filename: "removeme.txt",
      });

      expect(registry.size).toBe(1);
      const removed = await registry.remove(ref.id);
      expect(removed).toBe(true);
      expect(registry.size).toBe(0);
      expect(registry.get(ref.id)).toBeUndefined();
    });

    it("should return false when removing nonexistent ID", async () => {
      const removed = await registry.remove("nonexistent");
      expect(removed).toBe(false);
    });

    it("should clear all files", async () => {
      await registry.register(Buffer.from("a"), "buffer", {
        filename: "a.txt",
      });
      await registry.register(Buffer.from("b"), "buffer", {
        filename: "b.txt",
      });

      expect(registry.size).toBe(2);
      await registry.clear();
      expect(registry.size).toBe(0);
    });
  });

  // ─── Prompt Preview ──────────────────────────────────────────

  describe("generatePromptPreview", () => {
    it("should return empty string when no files registered", async () => {
      expect(await registry.generatePromptPreview()).toBe("");
    });

    it("should include file names and sizes in preview", async () => {
      await registry.register(Buffer.from("content"), "buffer", {
        filename: "report.csv",
      });

      const preview = await registry.generatePromptPreview();
      expect(preview).toContain("report.csv");
      expect(preview).toContain("Attached Files (1)");
    });

    it("should include full content for tiny files", async () => {
      const content = "Hello, world!";
      await registry.register(Buffer.from(content), "buffer", {
        filename: "tiny.txt",
      });

      const preview = await registry.generatePromptPreview();
      expect(preview).toContain("Hello, world!");
    });

    it("should include guidance for larger files", async () => {
      const buffer = makeTextBuffer(200 * 1024); // medium tier
      await registry.register(buffer, "buffer", {
        filename: "large-data.csv",
      });

      const preview = await registry.generatePromptPreview();
      expect(preview).toContain("read_file_section");
      expect(preview).toContain("search_in_file");
    });
  });

  // ─── Path Registration ───────────────────────────────────────

  describe("registerFromPath", () => {
    it("should register a file from a path on disk", async () => {
      // Create a temp file
      const testDir = join(tmpdir(), `neurolink-path-test-${randomUUID()}`);
      await mkdir(testDir, { recursive: true });
      const testFile = join(testDir, "test-file.txt");
      await writeFile(testFile, "Line 1\nLine 2\nLine 3\n");

      try {
        const ref = await registry.registerFromPath(testFile);
        expect(ref.filename).toBe("test-file.txt");
        expect(ref.source).toBe("path");
        expect(ref.originalPath).toBe(testFile);
        expect(ref.detectedType).toBe("text");
        expect(ref.preview).toContain("Line 1");
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });
  });

  // ─── Summary ─────────────────────────────────────────────────

  describe("setSummary", () => {
    it("should store a summary for a file", async () => {
      const ref = await registry.register(Buffer.from("content"), "buffer", {
        filename: "test.txt",
      });

      registry.setSummary(ref.id, "This file contains test content.");

      const updated = registry.get(ref.id);
      expect(updated!.summary).toBe("This file contains test content.");
      expect(updated!.status).toBe("processed");
    });
  });

  // ─── Extension Detection ─────────────────────────────────────

  describe("extension-based type detection", () => {
    it("should detect Python files as text", async () => {
      const ref = await registry.register(
        Buffer.from("def hello():\n  pass"),
        "buffer",
        { filename: "script.py" },
      );
      expect(ref.detectedType).toBe("text");
      expect(ref.extension).toBe("py");
    });

    it("should detect XLSX by ZIP magic + extension", async () => {
      const buf = Buffer.alloc(100);
      buf[0] = 0x50; // PK header
      buf[1] = 0x4b;
      const ref = await registry.register(buf, "buffer", {
        filename: "data.xlsx",
      });
      expect(ref.detectedType).toBe("xlsx");
    });

    it("should detect DOCX by ZIP magic + extension", async () => {
      const buf = Buffer.alloc(100);
      buf[0] = 0x50;
      buf[1] = 0x4b;
      const ref = await registry.register(buf, "buffer", {
        filename: "doc.docx",
      });
      expect(ref.detectedType).toBe("docx");
    });
  });

  // ─── extractContent Dispatch ───────────────────────────────────

  describe("extractContent", () => {
    it("should return error for non-existent file_id", async () => {
      const result = await registry.extractContent({
        file_id: "nonexistent",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("File not found");
    });

    it("should extract text content from a text file", async () => {
      const content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
      const ref = await registry.register(Buffer.from(content), "buffer", {
        filename: "test.txt",
      });

      const result = await registry.extractContent({
        file_id: ref.id,
      });
      expect(result.success).toBe(true);
      expect(result.text).toContain("Line 1");
    });

    it("should extract text content by filename", async () => {
      const content = "Hello from filename lookup";
      await registry.register(Buffer.from(content), "buffer", {
        filename: "findme.txt",
      });

      const result = await registry.extractContent({
        file_id: "findme.txt",
      });
      expect(result.success).toBe(true);
      expect(result.text).toContain("Hello from filename lookup");
    });

    it("should handle line range for text files via page_range", async () => {
      const content = Array.from(
        { length: 20 },
        (_, i) => `Line ${i + 1}`,
      ).join("\n");
      const ref = await registry.register(Buffer.from(content), "buffer", {
        filename: "ranged.txt",
      });

      const result = await registry.extractContent({
        file_id: ref.id,
        page_range: { start: 3, end: 7 },
      });
      expect(result.success).toBe(true);
      expect(result.text).toContain("Line 3");
      expect(result.text).toContain("Line 7");
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.startLine).toBe(3);
    });

    it("should return error when buffer is not available for binary file", async () => {
      // Register a PDF ref but then clear temp
      const buf = makePdfBuffer(50_000);
      const ref = await registry.register(buf, "buffer", {
        filename: "report.pdf",
      });

      // Delete the temp file to simulate eviction
      if (ref.tempPath) {
        const { unlink } = await import("node:fs/promises");
        await unlink(ref.tempPath).catch(() => {});
        ref.tempPath = undefined;
      }

      const result = await registry.extractContent({
        file_id: ref.id,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("No file data available");
    });
  });

  // ─── Extraction Hints ──────────────────────────────────────────

  describe("getExtractionHint", () => {
    it("should return video-specific hint", () => {
      const hint = FileReferenceRegistry.getExtractionHint("video", "7.6 MB");
      expect(hint).toContain("start_time");
      expect(hint).toContain("end_time");
      expect(hint).toContain("extract_file_content");
    });

    it("should return PDF-specific hint", () => {
      const hint = FileReferenceRegistry.getExtractionHint("pdf", "2.1 MB");
      expect(hint).toContain("pages");
      expect(hint).toContain("page_range");
    });

    it("should return spreadsheet-specific hint", () => {
      const hint = FileReferenceRegistry.getExtractionHint("xlsx", "500 KB");
      expect(hint).toContain("sheet");
      expect(hint).toContain("row_range");
      expect(hint).toContain("columns");
    });

    it("should return PPTX-specific hint", () => {
      const hint = FileReferenceRegistry.getExtractionHint("pptx", "3.2 MB");
      expect(hint).toContain("pages");
      expect(hint).toContain("slides");
    });

    it("should return archive-specific hint", () => {
      const hint = FileReferenceRegistry.getExtractionHint("archive", "10 MB");
      expect(hint).toContain("entry_path");
    });

    it("should return null for text files", () => {
      const hint = FileReferenceRegistry.getExtractionHint("text", "50 KB");
      expect(hint).toBeNull();
    });
  });

  // ─── Prompt Preview with Hints ─────────────────────────────────

  describe("generatePromptPreview with extraction hints", () => {
    it("should include video extraction hints", async () => {
      // Create a fake video buffer (MP4 magic bytes)
      const buf = Buffer.alloc(200 * 1024);
      buf[4] = 0x66; // ftyp
      buf[5] = 0x74;
      buf[6] = 0x79;
      buf[7] = 0x70;
      const ref = await registry.register(buf, "buffer", {
        filename: "demo.mp4",
      });

      // Manually set processed content to avoid real ffmpeg processing
      ref.processedContent = "[Video File: demo.mp4]\nDuration: 30s";
      ref.status = "processed";

      const preview = await registry.generatePromptPreview();
      expect(preview).toContain("start_time");
      expect(preview).toContain("end_time");
      expect(preview).toContain("extract_file_content");
    });
  });
});
