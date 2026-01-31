import { describe, it, expect } from "vitest";
import {
  validatePPTOutputOptions,
  validatePPTGenerationInput,
} from "../../src/lib/utils/parameterValidation.js";
import type { GenerateOptions } from "../../src/lib/types/index.js";
import { PPTOutputOptions } from "../../src/lib/types/pptTypes.js";
import { AIProviderName } from "../../src/lib/constants/enums.js";

// -----------------------------------------------------------------------
// PPT Gen Validation Tests
// -----------------------------------------------------------------------

describe("PPT Validation", () => {
  describe("validatePPTOutputOptions", () => {
    it("should accept valid PPT options", () => {
      const validOptions: PPTOutputOptions = {
        pages: 10,
        format: "pptx",
        theme: "modern",
        audience: "business",
        tone: "professional",
        includeImages: true,
        outputPath: "./output/presentation.pptx",
      };

      const error = validatePPTOutputOptions(validOptions);
      expect(error).toBeNull();
    });

    it("should reject missing pages field", () => {
      const options = {} as PPTOutputOptions;
      const error = validatePPTOutputOptions(options);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("MISSING_PPT_PROPERTIES");
    });

    it("should accept minimal valid options", () => {
      const minimalOptions: PPTOutputOptions = {
        pages: 5,
      };

      const error = validatePPTOutputOptions(minimalOptions);
      expect(error).toBeNull();
    });

    it("should reject pages < 1", () => {
      const options: PPTOutputOptions = { pages: 0 };
      const error = validatePPTOutputOptions(options);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("INVALID_PPT_PAGES");
    });

    it("should reject pages > 50", () => {
      const options: PPTOutputOptions = { pages: 51 };
      const error = validatePPTOutputOptions(options);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("INVALID_PPT_PAGES");
    });

    it("should reject non-integer pages", () => {
      const options: PPTOutputOptions = { pages: 10.5 };
      const error = validatePPTOutputOptions(options);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("INVALID_PPT_PAGES");
    });

    it("should reject invalid theme", () => {
      const options = {
        pages: 10,
        theme: "invalid-theme",
      } as unknown as PPTOutputOptions;
      const error = validatePPTOutputOptions(options);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("INVALID_PPT_OUTPUT_OPTIONS");
    });

    it("should reject invalid audience", () => {
      const options = {
        pages: 10,
        audience: "invalid-audience",
      } as unknown as PPTOutputOptions;
      const error = validatePPTOutputOptions(options);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("INVALID_PPT_OUTPUT_OPTIONS");
    });

    it("should reject invalid tone", () => {
      const options = {
        pages: 10,
        tone: "invalid-tone",
      } as unknown as PPTOutputOptions;
      const error = validatePPTOutputOptions(options);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("INVALID_PPT_OUTPUT_OPTIONS");
    });

    it("should reject invalid format", () => {
      const options = {
        pages: 10,
        format: "pdf",
      } as unknown as PPTOutputOptions;
      const error = validatePPTOutputOptions(options);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("INVALID_PPT_FORMAT");
    });

    it("should reject non-boolean includeImages", () => {
      const options = {
        pages: 10,
        includeImages: "yes",
      } as unknown as PPTOutputOptions;
      const error = validatePPTOutputOptions(options);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("INVALID_PPT_OUTPUT_OPTIONS");
    });

    it("should reject empty outputPath", () => {
      const options: PPTOutputOptions = {
        pages: 10,
        outputPath: "   ",
      };
      const error = validatePPTOutputOptions(options);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("INVALID_PPT_OUTPUT_PATH");
    });

    it("should reject invalid aspectRatio", () => {
      const options = {
        pages: 10,
        aspectRatio: "21:9",
      } as unknown as PPTOutputOptions;
      const error = validatePPTOutputOptions(options);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("INVALID_PPT_OUTPUT_OPTIONS");
    });

    it("should reject empty logoPath", () => {
      const options: PPTOutputOptions = {
        pages: 10,
        logoPath: "",
      };
      const error = validatePPTOutputOptions(options);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("INVALID_PPT_LOGO_PATH");
    });

    it("should reject non-string logoPath", () => {
      const options = {
        pages: 10,
        logoPath: 123,
      } as unknown as PPTOutputOptions;
      const error = validatePPTOutputOptions(options);

      expect(error).not.toBeNull();
      expect(error?.code).toBe("INVALID_PPT_LOGO_PATH");
    });
  });

  describe("validatePPTGenerationInput", () => {
    it("should accept valid PPT generation input", () => {
      const options: GenerateOptions = {
        input: { text: "Introducing Our New Product" },
        output: {
          mode: "ppt",
          ppt: {
            pages: 10,
            theme: "modern",
          },
        },
      };

      const result = validatePPTGenerationInput(options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept missing mode (mode is optional)", () => {
      const options: GenerateOptions = {
        input: { text: "Test presentation content" },
        output: {
          ppt: { pages: 10 },
        },
      };

      const result = validatePPTGenerationInput(options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid mode (if mode provided, must be ppt)", () => {
      const options: GenerateOptions = {
        input: { text: "Test presentation content" },
        output: {
          mode: "video",
          ppt: { pages: 10 },
        },
      };

      const result = validatePPTGenerationInput(options);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_PPT_MODE")).toBe(
        true,
      );
    });

    it("should reject empty prompt", () => {
      const options: GenerateOptions = {
        input: { text: "   " },
        output: {
          mode: "ppt",
          ppt: { pages: 10 },
        },
      };

      const result = validatePPTGenerationInput(options);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_PPT_PROMPT")).toBe(
        true,
      );
    });

    it("should reject prompt that is too short", () => {
      const options: GenerateOptions = {
        input: { text: "Short" }, // Only 5 characters
        output: {
          mode: "ppt",
          ppt: { pages: 10 },
        },
      };

      const result = validatePPTGenerationInput(options);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_PPT_PROMPT")).toBe(
        true,
      );
    });

    it("should reject prompt that is too long", () => {
      const longPrompt = "a".repeat(1001);
      const options: GenerateOptions = {
        input: { text: longPrompt },
        output: {
          mode: "ppt",
          ppt: { pages: 10 },
        },
      };

      const result = validatePPTGenerationInput(options);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_PPT_PROMPT")).toBe(
        true,
      );
    });

    it("should add warning for large slide counts", () => {
      const options: GenerateOptions = {
        input: { text: "Test presentation with many slides" },
        output: {
          mode: "ppt",
          ppt: { pages: 35 },
        },
      };

      const result = validatePPTGenerationInput(options);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("may take significant time");
    });

    it("should provide helpful suggestions for valid input", () => {
      const options: GenerateOptions = {
        input: { text: "Test presentation for validation" },
        output: {
          mode: "ppt",
          ppt: { pages: 10 },
        },
      };

      const result = validatePPTGenerationInput(options);
      expect(result.isValid).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("should accept valid AIProviderName enum values", () => {
      const validProviders = [
        AIProviderName.VERTEX,
        AIProviderName.OPENAI,
        AIProviderName.AZURE,
        AIProviderName.ANTHROPIC,
        AIProviderName.GOOGLE_AI,
        AIProviderName.BEDROCK,
      ];

      for (const provider of validProviders) {
        const options: GenerateOptions = {
          input: { text: "Test presentation" },
          provider: provider,
          output: {
            mode: "ppt",
            ppt: { pages: 10 },
          },
        };

        const result = validatePPTGenerationInput(options);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it("should reject unsupported AIProviderName enum values", () => {
      const unsupportedProviders = [
        AIProviderName.HUGGINGFACE,
        AIProviderName.OLLAMA,
        AIProviderName.SAGEMAKER,
        AIProviderName.OPENAI_COMPATIBLE,
        AIProviderName.OPENROUTER,
        AIProviderName.MISTRAL,
        AIProviderName.LITELLM,
      ];

      for (const provider of unsupportedProviders) {
        const options: GenerateOptions = {
          input: { text: "Test presentation" },
          provider: provider,
          output: {
            mode: "ppt",
            ppt: { pages: 10 },
          },
        };

        const result = validatePPTGenerationInput(options);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toBe("INVALID_PPT_PROVIDER");
      }
    });
  });
});
