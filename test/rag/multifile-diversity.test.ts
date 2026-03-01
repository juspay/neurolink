/**
 * Tests for RAG multi-file diversity improvements.
 *
 * Verifies:
 * - diversifyResults round-robins results across source files
 * - Improved generateSimpleEmbedding produces distinct vectors for different text
 * - Multi-file topK is auto-increased
 * - End-to-end multi-file RAG returns results from all files
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  _diversifyResults as diversifyResults,
  _generateSimpleEmbedding as generateSimpleEmbedding,
  prepareRAGTool,
} from "../../src/lib/rag/ragIntegration.js";
import type { VectorQueryResult } from "../../src/lib/rag/types.js";

const TEMP_DIR = join(process.cwd(), "test/fixtures/rag/temp-multifile");

describe("RAG Multi-File Diversity", () => {
  beforeAll(() => {
    if (!existsSync(TEMP_DIR)) {
      mkdirSync(TEMP_DIR, { recursive: true });
    }

    // File A: about machine learning
    writeFileSync(
      join(TEMP_DIR, "ml-guide.md"),
      `# Machine Learning Guide

## Supervised Learning
Supervised learning uses labeled training data to learn a mapping function.
Common algorithms include linear regression, decision trees, and SVMs.

## Unsupervised Learning
Unsupervised learning finds hidden patterns in unlabeled data.
Clustering and dimensionality reduction are key techniques.

## Reinforcement Learning
Reinforcement learning trains agents through reward signals.
It is used in robotics, game playing, and autonomous systems.`,
    );

    // File B: about web development
    writeFileSync(
      join(TEMP_DIR, "web-dev.md"),
      `# Web Development Guide

## Frontend
Frontend development involves HTML, CSS, and JavaScript.
Modern frameworks include React, Vue, and Svelte.

## Backend
Backend development handles server-side logic and databases.
Popular frameworks include Express, Django, and Rails.

## DevOps
DevOps practices include CI/CD, containerization, and monitoring.
Tools like Docker, Kubernetes, and GitHub Actions are widely used.`,
    );

    // File C: about cooking
    writeFileSync(
      join(TEMP_DIR, "cooking.md"),
      `# Cooking Fundamentals

## Baking
Baking involves dry heat in an oven for breads, cakes, and pastries.
Temperature control and precise measurements are essential.

## Grilling
Grilling uses direct heat for meats, vegetables, and seafood.
Marinades and rubs add flavor to grilled dishes.

## Sauteing
Sauteing cooks food quickly in a small amount of oil or butter.
It is ideal for vegetables, thin cuts of meat, and stir-fries.`,
    );
  });

  afterAll(() => {
    try {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe("diversifyResults", () => {
    it("should round-robin results across source files", () => {
      const results: VectorQueryResult[] = [
        { id: "a1", score: 0.9, metadata: { source: "/fileA" } },
        { id: "a2", score: 0.85, metadata: { source: "/fileA" } },
        { id: "a3", score: 0.8, metadata: { source: "/fileA" } },
        { id: "b1", score: 0.7, metadata: { source: "/fileB" } },
        { id: "b2", score: 0.65, metadata: { source: "/fileB" } },
        { id: "c1", score: 0.6, metadata: { source: "/fileC" } },
      ];

      const diversified = diversifyResults(results, 6);

      // First round should take one from each file
      const firstThreeSources = diversified
        .slice(0, 3)
        .map((r) => r.metadata?.source);
      expect(firstThreeSources).toContain("/fileA");
      expect(firstThreeSources).toContain("/fileB");
      expect(firstThreeSources).toContain("/fileC");
    });

    it("should respect topK limit", () => {
      const results: VectorQueryResult[] = [
        { id: "a1", score: 0.9, metadata: { source: "/fileA" } },
        { id: "a2", score: 0.85, metadata: { source: "/fileA" } },
        { id: "b1", score: 0.7, metadata: { source: "/fileB" } },
        { id: "b2", score: 0.65, metadata: { source: "/fileB" } },
      ];

      const diversified = diversifyResults(results, 2);
      expect(diversified).toHaveLength(2);
    });

    it("should include at least one result per file when topK allows", () => {
      const results: VectorQueryResult[] = [
        { id: "a1", score: 0.99, metadata: { source: "/fileA" } },
        { id: "a2", score: 0.98, metadata: { source: "/fileA" } },
        { id: "a3", score: 0.97, metadata: { source: "/fileA" } },
        { id: "a4", score: 0.96, metadata: { source: "/fileA" } },
        { id: "b1", score: 0.1, metadata: { source: "/fileB" } },
      ];

      const diversified = diversifyResults(results, 3);
      const sources = new Set(diversified.map((r) => r.metadata?.source));
      expect(sources.has("/fileA")).toBe(true);
      expect(sources.has("/fileB")).toBe(true);
    });

    it("should passthrough when only one source file", () => {
      const results: VectorQueryResult[] = [
        { id: "a1", score: 0.9, metadata: { source: "/fileA" } },
        { id: "a2", score: 0.8, metadata: { source: "/fileA" } },
      ];

      const diversified = diversifyResults(results, 5);
      expect(diversified).toEqual(results);
    });

    it("should handle empty results", () => {
      const diversified = diversifyResults([], 5);
      expect(diversified).toEqual([]);
    });

    it("should handle missing metadata gracefully", () => {
      const results: VectorQueryResult[] = [
        { id: "a1", score: 0.9 },
        { id: "b1", score: 0.8, metadata: { source: "/fileB" } },
      ];

      const diversified = diversifyResults(results, 2);
      expect(diversified).toHaveLength(2);
    });
  });

  describe("generateSimpleEmbedding", () => {
    it("should produce a unit vector", () => {
      const emb = generateSimpleEmbedding("hello world", 128);
      const magnitude = Math.sqrt(emb.reduce((s, v) => s + v * v, 0));
      expect(magnitude).toBeCloseTo(1.0, 4);
    });

    it("should produce deterministic results", () => {
      const a = generateSimpleEmbedding("same text", 128);
      const b = generateSimpleEmbedding("same text", 128);
      expect(a).toEqual(b);
    });

    it("should produce distinct vectors for semantically different text", () => {
      const ml = generateSimpleEmbedding(
        "machine learning neural networks deep learning algorithms training data",
        128,
      );
      const cooking = generateSimpleEmbedding(
        "baking bread oven temperature flour yeast kneading dough",
        128,
      );

      // Cosine similarity should be noticeably lower for different text
      // (hash-based embeddings won't be perfectly semantic, but should discriminate)
      let dot = 0;
      for (let i = 0; i < ml.length; i++) {
        dot += ml[i] * cooking[i];
      }
      // Both are unit vectors, so dot product IS cosine similarity
      expect(dot).toBeLessThan(0.95);
    });

    it("should produce similar vectors for semantically similar text", () => {
      const a = generateSimpleEmbedding(
        "machine learning algorithms training data models",
        128,
      );
      const b = generateSimpleEmbedding(
        "machine learning models data training algorithms",
        128,
      );

      let dot = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
      }
      expect(dot).toBeGreaterThan(0.8);
    });

    it("should handle empty text", () => {
      const emb = generateSimpleEmbedding("", 128);
      expect(emb).toHaveLength(128);
      // All zeros (magnitude 0, no normalization applied)
      expect(emb.every((v) => v === 0)).toBe(true);
    });

    it("should respect the dimension parameter", () => {
      const emb64 = generateSimpleEmbedding("test", 64);
      const emb256 = generateSimpleEmbedding("test", 256);
      expect(emb64).toHaveLength(64);
      expect(emb256).toHaveLength(256);
    });
  });

  describe("Multi-file topK auto-increase", () => {
    it("should auto-increase topK for multi-file scenarios", async () => {
      const result = await prepareRAGTool({
        files: [
          join(TEMP_DIR, "ml-guide.md"),
          join(TEMP_DIR, "web-dev.md"),
          join(TEMP_DIR, "cooking.md"),
        ],
        topK: 2, // Explicitly small
      });

      // Search should still return results from multiple files
      // because topK is auto-increased to max(2, 3*3) = 9
      const searchResult = await result.tool.execute!(
        { query: "learning techniques" },
        { toolCallId: "test", messages: [] },
      );

      expect(searchResult.totalResults).toBeGreaterThan(2);
    });

    it("should not auto-increase topK for single file", async () => {
      const result = await prepareRAGTool({
        files: [join(TEMP_DIR, "ml-guide.md")],
        topK: 2,
      });

      const searchResult = await result.tool.execute!(
        { query: "supervised learning" },
        { toolCallId: "test", messages: [] },
      );

      expect(searchResult.totalResults).toBeLessThanOrEqual(2);
    });
  });

  describe("End-to-end multi-file diversity", () => {
    it("should return results from multiple source files", async () => {
      const result = await prepareRAGTool({
        files: [
          join(TEMP_DIR, "ml-guide.md"),
          join(TEMP_DIR, "web-dev.md"),
          join(TEMP_DIR, "cooking.md"),
        ],
      });

      const searchResult = await result.tool.execute!(
        { query: "techniques and methods" },
        { toolCallId: "test", messages: [] },
      );

      // Collect unique source files from results
      const sourceFiles = new Set(
        searchResult.sources.map((s: { source?: string }) => s.source),
      );

      // With diversity, results should span multiple files
      expect(sourceFiles.size).toBeGreaterThanOrEqual(2);
    });

    it("should load all files and create chunks from each", async () => {
      const result = await prepareRAGTool({
        files: [
          join(TEMP_DIR, "ml-guide.md"),
          join(TEMP_DIR, "web-dev.md"),
          join(TEMP_DIR, "cooking.md"),
        ],
      });

      expect(result.filesLoaded).toBe(3);
      expect(result.chunksIndexed).toBeGreaterThanOrEqual(3);
    });
  });
});
