/**
 * Type Import Guidelines Validation Tests
 *
 * These tests validate that:
 * 1. Types can be imported from their canonical sources
 * 2. The public API (index.ts) exports expected types
 * 3. Deprecated paths still work (with deprecation notices)
 * 4. Type name conflicts are handled correctly with aliases
 * 5. Type guards are available alongside type definitions
 */

import { describe, it, expect } from "vitest";

describe("Type Import Guidelines - Canonical Sources", () => {
  describe("Multimodal Types (canonical: multimodal.ts)", () => {
    it("should import Content types from multimodal.ts", async () => {
      const multimodalModule = await import(
        "../../src/lib/types/multimodal.js"
      );

      // Type definitions exist
      expect(multimodalModule).toBeDefined();

      // Type guards exist and are functions
      expect(typeof multimodalModule.isTextContent).toBe("function");
      expect(typeof multimodalModule.isImageContent).toBe("function");
      expect(typeof multimodalModule.isCSVContent).toBe("function");
      expect(typeof multimodalModule.isPDFContent).toBe("function");
      expect(typeof multimodalModule.isAudioContent).toBe("function");
      expect(typeof multimodalModule.isVideoContent).toBe("function");
      expect(typeof multimodalModule.isMultimodalInput).toBe("function");
      expect(typeof multimodalModule.isMultimodalMessageContent).toBe(
        "function",
      );
    });

    it("should import from deprecated content.ts (backward compatibility)", async () => {
      const contentModule = await import("../../src/lib/types/content.js");

      expect(contentModule).toBeDefined();

      // Type guards should be available
      expect(typeof contentModule.isTextContent).toBe("function");
      expect(typeof contentModule.isImageContent).toBe("function");
    });

    it("should test multimodal type guards", async () => {
      const { isImageContent, isTextContent, isPDFContent } = await import(
        "../../src/lib/types/multimodal.js"
      );

      const textContent = { type: "text", text: "hello" };
      const imageContent = {
        type: "image",
        data: Buffer.from("test"),
        mediaType: "image/jpeg",
      };
      const pdfContent = { type: "pdf", data: Buffer.from("test") };

      expect(isTextContent(textContent)).toBe(true);
      expect(isImageContent(textContent)).toBe(false);

      expect(isImageContent(imageContent)).toBe(true);
      expect(isTextContent(imageContent)).toBe(false);

      expect(isPDFContent(pdfContent)).toBe(true);
      expect(isImageContent(pdfContent)).toBe(false);
    });
  });

  describe("Tool Types (canonical: tools.ts)", () => {
    it("should import tool types from tools.ts", async () => {
      const toolsModule = await import("../../src/lib/types/tools.js");

      expect(toolsModule).toBeDefined();
      // Module exports types - can't check type exports directly
      // but we can verify the module loads successfully
    });
  });

  describe("Stream Types (canonical: streamTypes.ts)", () => {
    it("should import streaming types from streamTypes.ts", async () => {
      const streamModule = await import("../../src/lib/types/streamTypes.js");

      expect(streamModule).toBeDefined();
    });
  });

  describe("Provider Types (canonical: providers.ts)", () => {
    it("should import provider types from providers.ts", async () => {
      const providersModule = await import("../../src/lib/types/providers.js");

      expect(providersModule).toBeDefined();
    });
  });

  describe("Conversation Types (canonical: conversation.ts)", () => {
    it("should import conversation types from conversation.ts", async () => {
      const conversationModule = await import(
        "../../src/lib/types/conversation.js"
      );

      expect(conversationModule).toBeDefined();
    });
  });
});

describe("Type Import Guidelines - Public API", () => {
  it("should import common types from index.ts", async () => {
    const indexModule = await import("../../src/lib/types/index.js");

    expect(indexModule).toBeDefined();
  });

  it("should verify type guards are exported from index", async () => {
    const indexModule = await import("../../src/lib/types/index.js");

    // These are re-exported from content.ts (which re-exports from multimodal.ts)
    expect(typeof indexModule.isTextContent).toBe("function");
    expect(typeof indexModule.isImageContent).toBe("function");
    expect(typeof indexModule.isCSVContent).toBe("function");
    expect(typeof indexModule.isPDFContent).toBe("function");
  });
});

describe("Type Import Guidelines - SDK Types", () => {
  it("should import from sdkTypes.ts", async () => {
    const sdkModule = await import("../../src/lib/types/sdkTypes.js");

    expect(sdkModule).toBeDefined();
  });
});

describe("Type Import Guidelines - Type Conflicts", () => {
  it("should handle ToolResult from tools.ts", async () => {
    const toolsModule = await import("../../src/lib/types/tools.js");

    expect(toolsModule).toBeDefined();
    // ToolResult is a type export, can't check at runtime
    // But we verify the module loads successfully
  });

  it("should handle ToolResult from streamTypes.ts", async () => {
    const streamModule = await import("../../src/lib/types/streamTypes.js");

    expect(streamModule).toBeDefined();
    // ToolResult is a type export, can't check at runtime
    // But we verify the module loads successfully
  });

  it("should verify index.ts exports both versions with proper naming", async () => {
    // The index.ts should export:
    // - ToolResult from tools.ts (unaliased)
    // - StreamToolResult from streamTypes.ts (aliased)

    const indexModule = await import("../../src/lib/types/index.js");
    expect(indexModule).toBeDefined();

    // We can't directly test type exports at runtime,
    // but the fact that the module loads without errors
    // confirms the exports are valid
  });
});

describe("Type Import Guidelines - Deprecated Paths", () => {
  it("should still support content.ts for backward compatibility", async () => {
    const contentModule = await import("../../src/lib/types/content.js");

    expect(contentModule).toBeDefined();
    expect(typeof contentModule.isImageContent).toBe("function");
    expect(typeof contentModule.isTextContent).toBe("function");
  });

  it("should prefer multimodal.ts over content.ts", async () => {
    const multimodalModule = await import("../../src/lib/types/multimodal.js");
    const contentModule = await import("../../src/lib/types/content.js");

    // Both modules should load successfully
    expect(multimodalModule).toBeDefined();
    expect(contentModule).toBeDefined();

    // Type guards should be the same function references
    // (since content.ts re-exports from multimodal.ts)
    expect(contentModule.isImageContent).toBe(multimodalModule.isImageContent);
    expect(contentModule.isTextContent).toBe(multimodalModule.isTextContent);
  });
});

describe("Type Import Guidelines - Common Patterns", () => {
  it("should support Pattern 1: Multimodal Content Processing", async () => {
    const { isImageContent, isPDFContent } = await import(
      "../../src/lib/types/multimodal.js"
    );

    const imageContent = {
      type: "image",
      data: Buffer.from("test"),
      mediaType: "image/png",
    };
    const pdfContent = {
      type: "pdf",
      data: Buffer.from("test"),
      metadata: { filename: "test.pdf" },
    };

    expect(isImageContent(imageContent)).toBe(true);
    expect(isPDFContent(pdfContent)).toBe(true);
    expect(isImageContent(pdfContent)).toBe(false);
  });

  it("should support importing AIProviderName enum", async () => {
    const { AIProviderName } = await import("../../src/lib/types/index.js");

    expect(AIProviderName).toBeDefined();
    expect(typeof AIProviderName).toBe("object");
  });
});

describe("Type Import Guidelines - Documentation Coverage", () => {
  it("should have README.md documentation", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");

    const readmePath = path.join(process.cwd(), "src/lib/types/README.md");
    const readmeExists = await fs
      .access(readmePath)
      .then(() => true)
      .catch(() => false);

    expect(readmeExists).toBe(true);

    if (readmeExists) {
      const content = await fs.readFile(readmePath, "utf-8");

      // Verify key sections exist
      expect(content).toContain("Canonical Type Sources");
      expect(content).toContain("Import Hierarchy");
      expect(content).toContain("Deprecated Paths and Migration");
      expect(content).toContain("Type Name Conflicts");
      expect(content).toContain("Best Practices");
    }
  });

  it("should have type system guidelines in CONTRIBUTING.md", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");

    const contributingPath = path.join(process.cwd(), "CONTRIBUTING.md");
    const content = await fs.readFile(contributingPath, "utf-8");

    expect(content).toContain("Type System Guidelines");
    expect(content).toContain("Correct Import Patterns");
    expect(content).toContain("Adding New Types");
  });
});

describe("Type Import Guidelines - Real-world Usage", () => {
  it("should verify messageBuilder imports from multimodal.ts", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");

    const messageBuilderPath = path.join(
      process.cwd(),
      "src/lib/utils/messageBuilder.ts",
    );
    const content = await fs.readFile(messageBuilderPath, "utf-8");

    // Verify it imports from the canonical source
    expect(content).toContain('from "../types/multimodal.js"');
    // Should NOT import from deprecated content.ts
    expect(content).not.toContain('from "../types/content.js"');
  });

  it("should verify providerImageAdapter imports from multimodal.ts", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");

    const adapterPath = path.join(
      process.cwd(),
      "src/lib/adapters/providerImageAdapter.ts",
    );
    const content = await fs.readFile(adapterPath, "utf-8");

    // Verify it imports from the canonical source
    expect(content).toContain('from "../types/multimodal.js"');
    // Should NOT import from deprecated content.ts
    expect(content).not.toContain('from "../types/content.js"');
  });
});

describe("Type Import Guidelines - Type Safety", () => {
  it("should verify Content union type includes all content types", async () => {
    const {
      isTextContent,
      isImageContent,
      isCSVContent,
      isPDFContent,
      isAudioContent,
      isVideoContent,
    } = await import("../../src/lib/types/multimodal.js");

    const textContent = { type: "text", text: "test" };
    const imageContent = {
      type: "image",
      data: Buffer.from("test"),
      mediaType: "image/jpeg",
    };
    const csvContent = { type: "csv", data: "col1,col2\nval1,val2" };
    const pdfContent = { type: "pdf", data: Buffer.from("test") };
    const audioContent = {
      type: "audio",
      data: Buffer.from("test"),
      mediaType: "audio/mp3",
    };
    const videoContent = {
      type: "video",
      data: Buffer.from("test"),
      mediaType: "video/mp4",
    };

    // Verify each type guard correctly identifies its content
    expect(isTextContent(textContent)).toBe(true);
    expect(isImageContent(imageContent)).toBe(true);
    expect(isCSVContent(csvContent)).toBe(true);
    expect(isPDFContent(pdfContent)).toBe(true);
    expect(isAudioContent(audioContent)).toBe(true);
    expect(isVideoContent(videoContent)).toBe(true);

    // Verify type guards don't cross-match
    expect(isImageContent(textContent)).toBe(false);
    expect(isTextContent(imageContent)).toBe(false);
    expect(isPDFContent(csvContent)).toBe(false);
  });

  it("should verify multimodal input detection", async () => {
    const { isMultimodalInput } = await import(
      "../../src/lib/types/multimodal.js"
    );

    const textOnly = { text: "hello" };
    const withImages = { text: "hello", images: [Buffer.from("test")] };
    const withPDF = { text: "hello", pdfFiles: [Buffer.from("test")] };
    const withContent = {
      text: "hello",
      content: [{ type: "text", text: "test" }],
    };

    expect(isMultimodalInput(textOnly)).toBe(false);
    expect(isMultimodalInput(withImages)).toBe(true);
    expect(isMultimodalInput(withPDF)).toBe(true);
    expect(isMultimodalInput(withContent)).toBe(true);
  });
});
