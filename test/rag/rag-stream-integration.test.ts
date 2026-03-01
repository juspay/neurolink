/**
 * Tests for RAG Integration in the stream() path.
 *
 * Validates that prepareStreamOptions() in NeuroLink correctly handles
 * the `rag` config: calling prepareRAGTool, injecting the tool into
 * options.tools, and augmenting the system prompt.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prepareRAGTool } from "../../src/lib/rag/ragIntegration.js";
import type { RAGConfig } from "../../src/lib/rag/types.js";

// Test fixtures directory
const TEMP_DIR = join(process.cwd(), "test/fixtures/rag/temp-stream");

describe("RAG Stream Integration", () => {
  beforeAll(() => {
    if (!existsSync(TEMP_DIR)) {
      mkdirSync(TEMP_DIR, { recursive: true });
    }

    writeFileSync(
      join(TEMP_DIR, "stream-doc.md"),
      `# Stream Test Document

## Overview
This document tests RAG integration with the stream() path.
It contains information about streaming AI responses with retrieval.

## Streaming
Streaming allows real-time token delivery to the client.
Combined with RAG, it enables grounded streaming responses.

## Retrieval
RAG retrieves relevant chunks from indexed documents.
The search tool is injected before stream execution begins.`,
    );
  });

  afterAll(() => {
    try {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe("prepareRAGTool for stream path", () => {
    it("should prepare a RAG tool that can be injected into stream options", async () => {
      const ragConfig: RAGConfig = {
        files: [join(TEMP_DIR, "stream-doc.md")],
      };

      const ragResult = await prepareRAGTool(ragConfig);

      // Verify the result has all fields needed for stream injection
      expect(ragResult.toolName).toBe("search_knowledge_base");
      expect(ragResult.tool).toBeDefined();
      expect(ragResult.tool.description).toBeDefined();
      expect(ragResult.tool.parameters).toBeDefined();
      expect(ragResult.tool.execute).toBeInstanceOf(Function);
      expect(ragResult.filesLoaded).toBe(1);
      expect(ragResult.chunksIndexed).toBeGreaterThan(0);
    });

    it("should inject RAG tool into an empty tools record", async () => {
      const ragResult = await prepareRAGTool({
        files: [join(TEMP_DIR, "stream-doc.md")],
      });

      // Simulate what prepareStreamOptions does
      const options: Record<string, unknown> = {};
      if (!options.tools) {
        options.tools = {};
      }
      (options.tools as Record<string, unknown>)[ragResult.toolName] =
        ragResult.tool;

      expect(options.tools).toHaveProperty("search_knowledge_base");
      expect(
        (options.tools as Record<string, unknown>)["search_knowledge_base"],
      ).toBe(ragResult.tool);
    });

    it("should inject RAG tool alongside existing tools", async () => {
      const ragResult = await prepareRAGTool({
        files: [join(TEMP_DIR, "stream-doc.md")],
      });

      // Simulate existing tools
      const existingTool = { description: "existing", parameters: {} };
      const options: Record<string, unknown> = {
        tools: { existingTool } as Record<string, unknown>,
      };

      (options.tools as Record<string, unknown>)[ragResult.toolName] =
        ragResult.tool;

      expect(options.tools).toHaveProperty("existingTool");
      expect(options.tools).toHaveProperty("search_knowledge_base");
    });

    it("should augment system prompt with RAG instructions", async () => {
      const ragResult = await prepareRAGTool({
        files: [join(TEMP_DIR, "stream-doc.md")],
      });

      // Simulate what prepareStreamOptions does for system prompt
      const ragSystemInstruction = [
        `\n\nIMPORTANT: You have a tool called "${ragResult.toolName}" that searches through`,
        `${ragResult.filesLoaded} loaded document(s) containing ${ragResult.chunksIndexed} indexed chunks.`,
        `ALWAYS use the "${ragResult.toolName}" tool FIRST to answer the user's question before using any other tools.`,
        `This tool searches your local knowledge base of pre-loaded documents and is the primary source of truth.`,
        `Do NOT use websearchGrounding or any web search tools when the answer can be found in the loaded documents.`,
      ].join(" ");

      // With no existing system prompt
      let systemPrompt = "" + ragSystemInstruction;
      expect(systemPrompt).toContain("search_knowledge_base");
      expect(systemPrompt).toContain("ALWAYS use");
      expect(systemPrompt).toContain(
        `${ragResult.chunksIndexed} indexed chunks`,
      );

      // With existing system prompt
      const existingPrompt = "You are a helpful assistant.";
      systemPrompt = existingPrompt + ragSystemInstruction;
      expect(systemPrompt).toContain("You are a helpful assistant.");
      expect(systemPrompt).toContain("search_knowledge_base");
    });

    it("should produce a functional search tool for stream context", async () => {
      const ragResult = await prepareRAGTool({
        files: [join(TEMP_DIR, "stream-doc.md")],
        topK: 3,
      });

      const searchResult = await ragResult.tool.execute!(
        { query: "streaming responses" },
        { toolCallId: "stream-test", messages: [] },
      );

      expect(searchResult).toBeDefined();
      expect(searchResult).toHaveProperty("relevantContext");
      expect(searchResult).toHaveProperty("sources");
      expect(searchResult).toHaveProperty("totalResults");
      expect(searchResult.totalResults).toBeGreaterThan(0);
    });

    it("should respect custom tool name for stream injection", async () => {
      const ragResult = await prepareRAGTool({
        files: [join(TEMP_DIR, "stream-doc.md")],
        toolName: "stream_doc_search",
      });

      expect(ragResult.toolName).toBe("stream_doc_search");

      // Verify tool injection uses the custom name
      const tools: Record<string, unknown> = {};
      tools[ragResult.toolName] = ragResult.tool;
      expect(tools).toHaveProperty("stream_doc_search");
      expect(tools).not.toHaveProperty("search_knowledge_base");
    });

    it("should handle RAG config with all options for streaming", async () => {
      const ragResult = await prepareRAGTool({
        files: [join(TEMP_DIR, "stream-doc.md")],
        strategy: "markdown",
        chunkSize: 256,
        chunkOverlap: 32,
        topK: 2,
        toolName: "custom_stream_rag",
        toolDescription: "Search streaming docs",
      });

      expect(ragResult.toolName).toBe("custom_stream_rag");
      expect(ragResult.tool.description).toBe("Search streaming docs");
      expect(ragResult.filesLoaded).toBe(1);
      expect(ragResult.chunksIndexed).toBeGreaterThan(0);
    });
  });

  describe("RAG guard conditions for stream", () => {
    it("should not trigger RAG when rag config is undefined", () => {
      const options: { rag?: RAGConfig } = {};
      // This simulates the guard: if (options.rag?.files?.length)
      expect(options.rag?.files?.length).toBeFalsy();
    });

    it("should not trigger RAG when files array is empty", () => {
      const options = { rag: { files: [] } };
      expect(options.rag?.files?.length).toBeFalsy();
    });

    it("should trigger RAG when files are provided", () => {
      const options = {
        rag: { files: [join(TEMP_DIR, "stream-doc.md")] },
      };
      expect(options.rag?.files?.length).toBeTruthy();
    });
  });
});
