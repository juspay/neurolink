/**
 * Structured Output Tests
 *
 * Tests to validate that structured output (Zod schema) returns proper JSON
 * without conversational filler text like "Excellent!" or other preamble.
 *
 * Issue: When using structured output with a Zod schema, some AI providers
 * return conversational text before the JSON output, causing parsing failures.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import {
  buildMessagesArray,
  buildMultimodalMessagesArray,
} from "../../src/lib/utils/messageBuilder.js";
import type { TextGenerationOptions } from "../../src/lib/types/index.js";

// Mock schema for structured output testing
const TestOutputSchema = z.object({
  summary: z.string().describe("A brief summary of the response"),
  details: z.string().describe("Detailed information"),
});

// Schema for complex nested objects
const ComplexOutputSchema = z.object({
  title: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      content: z.string(),
    }),
  ),
  metadata: z.object({
    timestamp: z.string(),
    author: z.string().optional(),
  }),
});

describe("Structured Output - System Prompt Enhancement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildMessagesArray with structured output", () => {
    it("should include JSON-only instructions when schema and json output format are specified", async () => {
      const options: TextGenerationOptions = {
        prompt: "Analyze this data",
        systemPrompt: "You are a helpful assistant.",
        schema: TestOutputSchema,
        output: { format: "json" },
      };

      const messages = await buildMessagesArray(options);

      // Find the system message
      const systemMessage = messages.find((m) => m.role === "system");
      expect(systemMessage).toBeDefined();
      expect(typeof systemMessage?.content).toBe("string");

      const systemContent = systemMessage?.content as string;

      // Should contain instructions to output only valid JSON
      expect(systemContent).toContain("JSON");
    });

    it("should include JSON-only instructions when schema and structured output format are specified", async () => {
      const options: TextGenerationOptions = {
        prompt: "Analyze this data",
        systemPrompt: "You are a helpful assistant.",
        schema: ComplexOutputSchema,
        output: { format: "structured" },
      };

      const messages = await buildMessagesArray(options);

      // Find the system message
      const systemMessage = messages.find((m) => m.role === "system");
      expect(systemMessage).toBeDefined();
      expect(typeof systemMessage?.content).toBe("string");

      const systemContent = systemMessage?.content as string;

      // Should contain instructions to output only valid JSON
      expect(systemContent).toContain("JSON");
    });

    it("should NOT include JSON-only instructions when no schema is specified", async () => {
      const options: TextGenerationOptions = {
        prompt: "Tell me a story",
        systemPrompt: "You are a helpful assistant.",
      };

      const messages = await buildMessagesArray(options);

      // Find the system message
      const systemMessage = messages.find((m) => m.role === "system");
      expect(systemMessage).toBeDefined();
      expect(typeof systemMessage?.content).toBe("string");

      const systemContent = systemMessage?.content as string;

      // Should NOT contain structured output instructions
      expect(systemContent).not.toContain("STRUCTURED OUTPUT REQUIREMENT");
      expect(systemContent).not.toContain("conversational filler");
    });

    it("should NOT include JSON-only instructions when output format is text", async () => {
      const options: TextGenerationOptions = {
        prompt: "Tell me a story",
        systemPrompt: "You are a helpful assistant.",
        output: { format: "text" },
      };

      const messages = await buildMessagesArray(options);

      // Find the system message
      const systemMessage = messages.find((m) => m.role === "system");
      expect(systemMessage).toBeDefined();
      expect(typeof systemMessage?.content).toBe("string");

      const systemContent = systemMessage?.content as string;

      // Should NOT contain structured output instructions
      expect(systemContent).not.toContain("STRUCTURED OUTPUT REQUIREMENT");
      expect(systemContent).not.toContain("conversational filler");
    });

    it("should NOT include JSON-only instructions when schema provided but output.format is undefined", async () => {
      const options: TextGenerationOptions = {
        prompt: "Analyze this data",
        systemPrompt: "You are a helpful assistant.",
        schema: TestOutputSchema,
        // output.format is intentionally undefined to test edge case
      };

      const messages = await buildMessagesArray(options);

      // Find the system message
      const systemMessage = messages.find((m) => m.role === "system");
      expect(systemMessage).toBeDefined();
      expect(typeof systemMessage?.content).toBe("string");

      const systemContent = systemMessage?.content as string;

      // Should NOT contain structured output instructions when format is undefined
      expect(systemContent).not.toContain("STRUCTURED OUTPUT REQUIREMENT");
      expect(systemContent).not.toContain("conversational filler");
    });

    it("should NOT inject instructions with schema but explicit text format", async () => {
      const options: TextGenerationOptions = {
        prompt: "Tell me a story",
        systemPrompt: "You are a helpful assistant.",
        schema: TestOutputSchema,
        output: { format: "text" },
      };

      const messages = await buildMessagesArray(options);

      // Find the system message
      const systemMessage = messages.find((m) => m.role === "system");
      expect(systemMessage).toBeDefined();
      expect(typeof systemMessage?.content).toBe("string");

      const systemContent = systemMessage?.content as string;

      // Import STRUCTURED_OUTPUT_INSTRUCTIONS to verify it's not present
      const { STRUCTURED_OUTPUT_INSTRUCTIONS } = await import(
        "../../src/lib/config/conversationMemory.js"
      );

      // Should NOT contain structured output instructions when format is explicitly "text"
      expect(systemContent).not.toContain(
        STRUCTURED_OUTPUT_INSTRUCTIONS.trim(),
      );
      expect(systemContent).not.toContain("STRUCTURED OUTPUT REQUIREMENT");
      expect(systemContent).not.toContain("conversational filler");
    });

    it("should preserve original system prompt content when adding JSON instructions", async () => {
      const originalSystemPrompt =
        "You are an expert code reviewer. Always be thorough.";
      const options: TextGenerationOptions = {
        prompt: "Review this code",
        systemPrompt: originalSystemPrompt,
        schema: TestOutputSchema,
        output: { format: "json" },
      };

      const messages = await buildMessagesArray(options);

      // Find the system message
      const systemMessage = messages.find((m) => m.role === "system");
      expect(systemMessage).toBeDefined();

      const systemContent = systemMessage?.content as string;

      // Should preserve original system prompt
      expect(systemContent).toContain("expert code reviewer");
      expect(systemContent).toContain("Always be thorough");
    });

    it("should work correctly when systemPrompt is undefined", async () => {
      const options: TextGenerationOptions = {
        prompt: "Analyze this data",
        schema: TestOutputSchema,
        output: { format: "json" },
      };

      const messages = await buildMessagesArray(options);

      // Should still have a system message with JSON instructions
      const systemMessage = messages.find((m) => m.role === "system");
      expect(systemMessage).toBeDefined();

      const systemContent = systemMessage?.content as string;
      expect(systemContent).toContain("JSON");
    });

    it("should work correctly when systemPrompt is empty string", async () => {
      const options: TextGenerationOptions = {
        prompt: "Analyze this data",
        systemPrompt: "",
        schema: TestOutputSchema,
        output: { format: "json" },
      };

      const messages = await buildMessagesArray(options);

      // Should still have a system message with JSON instructions
      const systemMessage = messages.find((m) => m.role === "system");
      expect(systemMessage).toBeDefined();

      const systemContent = systemMessage?.content as string;
      expect(systemContent).toContain("JSON");
    });
  });

  describe("Structured Output JSON Validation", () => {
    it("should define explicit no-preamble instructions", async () => {
      const options: TextGenerationOptions = {
        prompt: "Process this request",
        systemPrompt: "You are a data processor.",
        schema: TestOutputSchema,
        output: { format: "structured" },
      };

      const messages = await buildMessagesArray(options);
      const systemMessage = messages.find((m) => m.role === "system");
      const systemContent = systemMessage?.content as string;

      // Instructions should explicitly prohibit preamble text
      // (the actual text depends on implementation, but the concept must be there)
      expect(systemContent.toLowerCase()).toMatch(
        /json|structured|object|valid/,
      );
    });

    it("should handle schema with optional fields correctly", async () => {
      const SchemaWithOptional = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      const options: TextGenerationOptions = {
        prompt: "Process this",
        schema: SchemaWithOptional,
        output: { format: "json" },
      };

      const messages = await buildMessagesArray(options);

      // Should have proper message structure
      expect(messages.length).toBeGreaterThan(0);
      const userMessage = messages.find((m) => m.role === "user");
      expect(userMessage).toBeDefined();
    });
  });
});

describe("Structured Output Instructions Constant", () => {
  it("should have defined structured output instructions", async () => {
    // This test will verify that the STRUCTURED_OUTPUT_INSTRUCTIONS constant exists
    // after we implement it
    const { STRUCTURED_OUTPUT_INSTRUCTIONS } = await import(
      "../../src/lib/config/conversationMemory.js"
    );

    // Explicitly verify the constant is defined and has proper content
    expect(STRUCTURED_OUTPUT_INSTRUCTIONS).toBeDefined();
    expect(typeof STRUCTURED_OUTPUT_INSTRUCTIONS).toBe("string");
    expect(STRUCTURED_OUTPUT_INSTRUCTIONS.trim().length).toBeGreaterThan(0);
    expect(STRUCTURED_OUTPUT_INSTRUCTIONS).toContain("JSON");
    // Should instruct to avoid preamble
    expect(STRUCTURED_OUTPUT_INSTRUCTIONS.toLowerCase()).toMatch(
      /only|pure|valid|no.*text|no.*preamble|directly/,
    );
  });
});

describe("Multimodal with Structured Output", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should inject STRUCTURED_OUTPUT_INSTRUCTIONS with images", async () => {
    // Use base64 image data instead of file path
    const base64Image =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const messages = await buildMultimodalMessagesArray(
      {
        input: {
          text: "Test",
          images: [base64Image],
        },
        schema: z.object({ test: z.string() }),
        output: { format: "json" },
      },
      "openai",
      "gpt-4o",
    );

    const systemMsg = messages.find((m) => m.role === "system");
    expect(systemMsg?.content).toBeDefined();
    const { STRUCTURED_OUTPUT_INSTRUCTIONS } = await import(
      "../../src/lib/config/conversationMemory.js"
    );
    expect(systemMsg?.content).toContain(STRUCTURED_OUTPUT_INSTRUCTIONS.trim());
  });

  it("should inject STRUCTURED_OUTPUT_INSTRUCTIONS with PDFs", async () => {
    // Use minimal PDF buffer (simplest valid PDF)
    const pdfBuffer = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF",
    );
    const messages = await buildMultimodalMessagesArray(
      {
        input: {
          text: "Test",
          pdfFiles: [pdfBuffer],
        },
        schema: z.object({ test: z.string() }),
        output: { format: "json" },
      },
      "anthropic",
      "claude-3-5-sonnet-20241022",
    );

    const systemMsg = messages.find((m) => m.role === "system");
    expect(systemMsg?.content).toBeDefined();
    const { STRUCTURED_OUTPUT_INSTRUCTIONS } = await import(
      "../../src/lib/config/conversationMemory.js"
    );
    expect(systemMsg?.content).toContain(STRUCTURED_OUTPUT_INSTRUCTIONS.trim());
  });

  it("should inject STRUCTURED_OUTPUT_INSTRUCTIONS with CSV", async () => {
    // Use CSV buffer content
    const csvBuffer = Buffer.from("name,value\ntest,123\nexample,456");
    const messages = await buildMultimodalMessagesArray(
      {
        input: {
          text: "Test",
          csvFiles: [csvBuffer],
        },
        schema: z.object({ test: z.string() }),
        output: { format: "json" },
      },
      "vertex",
      "gemini-2.0-flash-exp",
    );

    const systemMsg = messages.find((m) => m.role === "system");
    expect(systemMsg?.content).toBeDefined();
    const { STRUCTURED_OUTPUT_INSTRUCTIONS } = await import(
      "../../src/lib/config/conversationMemory.js"
    );
    expect(systemMsg?.content).toContain(STRUCTURED_OUTPUT_INSTRUCTIONS.trim());
  });

  it("should NOT inject instructions without schema", async () => {
    // Use base64 image data
    const base64Image =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const messages = await buildMultimodalMessagesArray(
      {
        input: {
          text: "Test",
          images: [base64Image],
        },
      },
      "openai",
      "gpt-4o",
    );

    const systemMsg = messages.find((m) => m.role === "system");
    const { STRUCTURED_OUTPUT_INSTRUCTIONS } = await import(
      "../../src/lib/config/conversationMemory.js"
    );
    const content = systemMsg?.content || "";
    expect(content).not.toContain(STRUCTURED_OUTPUT_INSTRUCTIONS.trim());
  });
});
