import { describe, it, expect } from "vitest";
import { buildSummarizationPrompt } from "../../../../src/lib/context/prompts/summarizationPrompt.js";

describe("Summarization Prompt Builder", () => {
  describe("buildSummarizationPrompt - Initial", () => {
    it("should build initial prompt with 9 sections", () => {
      const prompt = buildSummarizationPrompt({
        isIncremental: false,
      });

      expect(prompt).toContain("Primary Request and Intent");
      expect(prompt).toContain("Key Technical Concepts");
      expect(prompt).toContain("Files and Code Sections");
      expect(prompt).toContain("Problem Solving");
      expect(prompt).toContain("Pending Tasks");
      expect(prompt).toContain("Task Evolution");
      expect(prompt).toContain("Current Work");
      expect(prompt).toContain("Next Step");
      expect(prompt).toContain("Required Files");
    });

    it("should include file context when provided", () => {
      const prompt = buildSummarizationPrompt({
        isIncremental: false,
        filesRead: ["src/index.ts", "src/utils.ts"],
        filesModified: ["src/main.ts"],
      });

      expect(prompt).toContain("src/index.ts");
      expect(prompt).toContain("src/utils.ts");
      expect(prompt).toContain("src/main.ts");
      expect(prompt).toContain("Files Read");
      expect(prompt).toContain("Files Modified");
    });

    it("should not include file section when no files provided", () => {
      const prompt = buildSummarizationPrompt({
        isIncremental: false,
      });

      expect(prompt).not.toContain("File Context:");
    });
  });

  describe("buildSummarizationPrompt - Incremental", () => {
    it("should include previous summary for incremental mode", () => {
      const previousSummary =
        "### 1. Primary Request\nThe user asked for help with authentication.";

      const prompt = buildSummarizationPrompt({
        isIncremental: true,
        previousSummary,
      });

      expect(prompt).toContain("Existing Summary");
      expect(prompt).toContain(previousSummary);
      expect(prompt).toContain("MERGE");
    });

    it("should fall back to initial prompt when no previous summary", () => {
      const prompt = buildSummarizationPrompt({
        isIncremental: true,
        // No previousSummary
      });

      // Should fall back to initial since there's nothing to merge with
      expect(prompt).toContain("Primary Request and Intent");
    });

    it("should instruct to update sections with new info", () => {
      const prompt = buildSummarizationPrompt({
        isIncremental: true,
        previousSummary: "Previous content",
      });

      expect(prompt).toContain("Update sections");
      expect(prompt).toContain("9-section");
    });
  });
});
