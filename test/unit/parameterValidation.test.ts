/**
 * Unit Tests for Parameter Validation Utilities
 *
 * Tests comprehensive validation functions for:
 * - Tool names and descriptions
 * - MCP tool structure validation
 * - Video generation options (resolution, length, aspect ratio, audio)
 * - Image validation for video (format detection, size limits)
 * - Text generation options (prompt, temperature, tokens)
 * - Stream options validation
 * - Helper functions (validation summaries, batch validation)
 *
 * All validators return ValidationError objects with:
 * - Descriptive error messages
 * - Field-specific error codes
 * - Actionable suggestions for fixes
 */

import { describe, expect, it } from "vitest";
import {
  createValidationSummary,
  hasOnlyWarnings,
  ValidationError,
  validateAsyncFunction,
  validateGenerateOptions,
  validateImageForVideo,
  validateMCPTool,
  validateNumberRange,
  validateObjectStructure,
  validateRequiredString,
  validateStreamOptions,
  validateTextGenerationOptions,
  validateToolBatch,
  validateToolDescription,
  validateToolExecutionParams,
  validateToolName,
  validateVideoGenerationInput,
  validateVideoOutputOptions,
} from "../../src/lib/utils/parameterValidation.js";
import {
  ErrorFactory,
  NeuroLinkError,
} from "../../src/lib/utils/errorHandling.js";

// Note: ValidationError is a class, not a type, so it doesn't use 'import type'

describe("ValidationError", () => {
  it("should create basic validation error", () => {
    const error = new ValidationError("Test error", "testField", "TEST_CODE");
    expect(error.message).toBe("Test error");
    expect(error.field).toBe("testField");
    expect(error.code).toBe("TEST_CODE");
    expect(error.name).toBe("ValidationError");
  });

  it("should create error with suggestions", () => {
    const error = new ValidationError("Test error", "field", "CODE", [
      "Suggestion 1",
      "Suggestion 2",
    ]);
    expect(error.suggestions).toEqual(["Suggestion 1", "Suggestion 2"]);
  });

  describe("Factory Methods (via ErrorFactory)", () => {
    it("should create invalidVideoResolution error", () => {
      const error = ErrorFactory.invalidVideoResolution("4K");
      expect(error).toBeInstanceOf(NeuroLinkError);
      expect(error.message).toContain("4K");
      expect(error.context.field).toBe("output.video.resolution");
      expect(error.code).toBe("INVALID_VIDEO_RESOLUTION");
    });

    it("should create invalidVideoLength error", () => {
      const error = ErrorFactory.invalidVideoLength(10);
      expect(error).toBeInstanceOf(NeuroLinkError);
      expect(error.message).toContain("10");
      expect(error.context.field).toBe("output.video.length");
      expect(error.code).toBe("INVALID_VIDEO_LENGTH");
    });

    it("should create invalidVideoAspectRatio error", () => {
      const error = ErrorFactory.invalidVideoAspectRatio("21:9");
      expect(error).toBeInstanceOf(NeuroLinkError);
      expect(error.message).toContain("21:9");
      expect(error.context.field).toBe("output.video.aspectRatio");
    });

    it("should create emptyImagePath error", () => {
      const error = ErrorFactory.emptyImagePath();
      expect(error).toBeInstanceOf(NeuroLinkError);
      expect(error.context.field).toBe("input.images");
      expect(error.code).toBe("EMPTY_IMAGE_PATH");
    });

    it("should create imageTooLarge error", () => {
      const error = ErrorFactory.imageTooLarge("15.5", "10");
      expect(error).toBeInstanceOf(NeuroLinkError);
      expect(error.message).toContain("15.5MB");
      expect(error.message).toContain("10MB");
    });

    it("should create invalidVideoAudio error", () => {
      const error = ErrorFactory.invalidVideoAudio("yes");
      expect(error).toBeInstanceOf(NeuroLinkError);
      expect(error.code).toBe("INVALID_VIDEO_AUDIO");
      expect(error.context.field).toBe("output.video.audio");
    });

    it("should create invalidVideoMode error", () => {
      const error = ErrorFactory.invalidVideoMode();
      expect(error).toBeInstanceOf(NeuroLinkError);
      expect(error.code).toBe("INVALID_VIDEO_MODE");
      expect(error.context.field).toBe("output.mode");
    });

    it("should create missingVideoImage error", () => {
      const error = ErrorFactory.missingVideoImage();
      expect(error).toBeInstanceOf(NeuroLinkError);
      expect(error.code).toBe("MISSING_VIDEO_IMAGE");
      expect(error.context.field).toBe("input.images");
    });

    it("should create emptyVideoPrompt error", () => {
      const error = ErrorFactory.emptyVideoPrompt();
      expect(error).toBeInstanceOf(NeuroLinkError);
      expect(error.code).toBe("EMPTY_VIDEO_PROMPT");
      expect(error.context.field).toBe("input.text");
    });

    it("should create videoPromptTooLong error", () => {
      const error = ErrorFactory.videoPromptTooLong(600, 500);
      expect(error).toBeInstanceOf(NeuroLinkError);
      expect(error.code).toBe("VIDEO_PROMPT_TOO_LONG");
      expect(error.message).toContain("600");
      expect(error.message).toContain("500");
    });

    it("should create invalidImageType error", () => {
      const error = ErrorFactory.invalidImageType();
      expect(error).toBeInstanceOf(NeuroLinkError);
      expect(error.code).toBe("INVALID_IMAGE_TYPE");
      expect(error.context.field).toBe("input.images");
    });

    it("should create imageTooSmall error", () => {
      const error = ErrorFactory.imageTooSmall();
      expect(error).toBeInstanceOf(NeuroLinkError);
      expect(error.code).toBe("IMAGE_TOO_SMALL");
      expect(error.context.field).toBe("input.images");
    });

    it("should create invalidImageFormat error", () => {
      const error = ErrorFactory.invalidImageFormat();
      expect(error).toBeInstanceOf(NeuroLinkError);
      expect(error.code).toBe("INVALID_IMAGE_FORMAT");
      expect(error.context.field).toBe("input.images");
    });
  });
});

describe("validateRequiredString", () => {
  it("should pass for valid string", () => {
    const error = validateRequiredString("valid", "fieldName");
    expect(error).toBeNull();
  });

  it("should fail for undefined", () => {
    const error = validateRequiredString(undefined, "fieldName");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("REQUIRED_FIELD");
  });

  it("should fail for null", () => {
    const error = validateRequiredString(null, "fieldName");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("REQUIRED_FIELD");
  });

  it("should fail for non-string", () => {
    const error = validateRequiredString(123, "fieldName");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_TYPE");
  });

  it("should fail for empty string", () => {
    const error = validateRequiredString("", "fieldName");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("MIN_LENGTH");
  });

  it("should fail for whitespace-only string", () => {
    const error = validateRequiredString("   ", "fieldName");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("MIN_LENGTH");
  });

  it("should respect minLength parameter", () => {
    const error = validateRequiredString("ab", "fieldName", 3);
    expect(error).not.toBeNull();
    expect(error?.message).toContain("3 characters");
  });
});

describe("validateNumberRange", () => {
  it("should pass for valid number in range", () => {
    const error = validateNumberRange(5, "fieldName", 1, 10);
    expect(error).toBeNull();
  });

  it("should pass for boundary values", () => {
    expect(validateNumberRange(1, "fieldName", 1, 10)).toBeNull();
    expect(validateNumberRange(10, "fieldName", 1, 10)).toBeNull();
  });

  it("should fail for number below range", () => {
    const error = validateNumberRange(0, "fieldName", 1, 10);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("OUT_OF_RANGE");
  });

  it("should fail for number above range", () => {
    const error = validateNumberRange(11, "fieldName", 1, 10);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("OUT_OF_RANGE");
  });

  it("should fail for NaN", () => {
    const error = validateNumberRange(NaN, "fieldName", 1, 10);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_TYPE");
  });

  it("should allow undefined for optional fields", () => {
    const error = validateNumberRange(undefined, "fieldName", 1, 10, false);
    expect(error).toBeNull();
  });

  it("should fail undefined for required fields", () => {
    const error = validateNumberRange(undefined, "fieldName", 1, 10, true);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("REQUIRED_FIELD");
  });
});

describe("validateAsyncFunction", () => {
  it("should pass for async function", () => {
    const asyncFn = async () => {};
    const error = validateAsyncFunction(asyncFn, "fieldName");
    expect(error).toBeNull();
  });

  it("should pass for function returning Promise", () => {
    const promiseFn = () => Promise.resolve();
    const error = validateAsyncFunction(promiseFn, "fieldName");
    expect(error).toBeNull();
  });

  it("should fail for non-function", () => {
    const error = validateAsyncFunction("not a function", "fieldName");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_TYPE");
  });

  it("should warn for sync function", () => {
    const syncFn = () => {};
    const error = validateAsyncFunction(syncFn, "fieldName");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("NOT_ASYNC");
  });
});

describe("validateObjectStructure", () => {
  it("should pass for valid object with required properties", () => {
    const obj = { prop1: "value", prop2: 123 };
    const error = validateObjectStructure(obj, "fieldName", ["prop1", "prop2"]);
    expect(error).toBeNull();
  });

  it("should pass with extra properties", () => {
    const obj = { prop1: "value", prop2: 123, extra: "allowed" };
    const error = validateObjectStructure(obj, "fieldName", ["prop1", "prop2"]);
    expect(error).toBeNull();
  });

  it("should fail for non-object", () => {
    const error = validateObjectStructure("not object", "fieldName", ["prop"]);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_TYPE");
  });

  it("should fail for null", () => {
    const error = validateObjectStructure(null, "fieldName", ["prop"]);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_TYPE");
  });

  it("should fail for missing required properties", () => {
    const obj = { prop1: "value" };
    const error = validateObjectStructure(obj, "fieldName", [
      "prop1",
      "prop2",
      "prop3",
    ]);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("MISSING_PROPERTIES");
    expect(error?.message).toContain("prop2");
    expect(error?.message).toContain("prop3");
  });
});

describe("validateToolName", () => {
  it("should pass for valid tool names", () => {
    expect(validateToolName("myTool")).toBeNull();
    expect(validateToolName("tool_with_underscores")).toBeNull();
    expect(validateToolName("tool-with-dashes")).toBeNull();
    expect(validateToolName("tool123")).toBeNull();
  });

  it("should fail for names starting with number", () => {
    const error = validateToolName("123tool");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_FORMAT");
  });

  it("should fail for names with special characters", () => {
    const error = validateToolName("tool@name");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_FORMAT");
  });

  it("should fail for names with spaces", () => {
    const error = validateToolName("my tool");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_FORMAT");
  });

  it("should fail for reserved names", () => {
    const error = validateToolName("execute");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("RESERVED_NAME");
  });

  it("should fail for names exceeding 64 characters", () => {
    const longName = "a".repeat(65);
    const error = validateToolName(longName);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("MAX_LENGTH");
  });
});

describe("validateToolDescription", () => {
  it("should pass for valid descriptions", () => {
    const error = validateToolDescription("This is a valid tool description");
    expect(error).toBeNull();
  });

  it("should fail for too short description", () => {
    // Use description with 10+ chars but <3 meaningful words
    const error = validateToolDescription("A tool is great");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("TOO_BRIEF");
  });

  it("should fail for description exceeding 500 characters", () => {
    const longDesc = "a".repeat(501);
    const error = validateToolDescription(longDesc);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("MAX_LENGTH");
  });
});

describe("validateMCPTool", () => {
  it("should pass for valid MCP tool", () => {
    const tool = {
      name: "validTool",
      description: "This is a valid tool description with enough words",
      execute: async () => {},
    };
    const result = validateMCPTool(tool);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should fail for non-object", () => {
    const result = validateMCPTool("not an object");
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should collect multiple errors", () => {
    const tool = {
      name: "123invalid",
      description: "short",
      execute: "not a function",
    };
    const result = validateMCPTool(tool);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it("should warn for invalid schemas", () => {
    const tool = {
      name: "validTool",
      description: "Valid description with enough meaningful words",
      execute: async () => {},
      inputSchema: "not an object",
    };
    const result = validateMCPTool(tool);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("validateVideoOutputOptions", () => {
  it("should pass for valid resolution", () => {
    const error = validateVideoOutputOptions({ resolution: "720p" });
    expect(error).toBeNull();
  });

  it("should pass for valid length", () => {
    const error = validateVideoOutputOptions({ length: 6 });
    expect(error).toBeNull();
  });

  it("should pass for valid aspect ratio", () => {
    const error = validateVideoOutputOptions({ aspectRatio: "16:9" });
    expect(error).toBeNull();
  });

  it("should pass for valid audio option", () => {
    expect(validateVideoOutputOptions({ audio: true })).toBeNull();
    expect(validateVideoOutputOptions({ audio: false })).toBeNull();
  });

  it("should fail for invalid resolution", () => {
    const error = validateVideoOutputOptions({
      resolution: "4K" as unknown as "720p",
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_VIDEO_RESOLUTION");
  });

  it("should fail for invalid length", () => {
    const error = validateVideoOutputOptions({ length: 10 as unknown as 6 });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_VIDEO_LENGTH");
  });

  it("should fail for invalid aspect ratio", () => {
    const error = validateVideoOutputOptions({
      aspectRatio: "21:9" as unknown as "16:9",
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_VIDEO_ASPECT_RATIO");
  });

  it("should fail for non-boolean audio", () => {
    const error = validateVideoOutputOptions({
      audio: "yes" as unknown as boolean,
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_VIDEO_AUDIO");
  });

  it("should pass for empty options object", () => {
    const error = validateVideoOutputOptions({});
    expect(error).toBeNull();
  });
});

describe("validateImageForVideo", () => {
  it("should pass for valid JPEG buffer", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const error = validateImageForVideo(jpeg);
    expect(error).toBeNull();
  });

  it("should pass for valid PNG buffer", () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
    ]);
    const error = validateImageForVideo(png);
    expect(error).toBeNull();
  });

  it("should pass for valid WebP buffer", () => {
    const webp = Buffer.from([
      0x52,
      0x49,
      0x46,
      0x46, // RIFF
      0x00,
      0x00,
      0x00,
      0x00, // size
      0x57,
      0x45,
      0x42,
      0x50, // WEBP
    ]);
    const error = validateImageForVideo(webp);
    expect(error).toBeNull();
  });

  it("should reject RIFF file without WEBP signature", () => {
    const riffNotWebP = Buffer.from([
      0x52,
      0x49,
      0x46,
      0x46, // RIFF
      0x00,
      0x00,
      0x00,
      0x00, // size
      0x41,
      0x56,
      0x49,
      0x20, // AVI (not WEBP)
    ]);
    const error = validateImageForVideo(riffNotWebP);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_IMAGE_FORMAT");
  });

  it("should pass for valid URL string", () => {
    const error = validateImageForVideo("https://example.com/image.jpg");
    expect(error).toBeNull();
  });

  it("should pass for valid file path string", () => {
    const error = validateImageForVideo("./images/photo.png");
    expect(error).toBeNull();
  });

  it("should fail for empty string", () => {
    const error = validateImageForVideo("");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("EMPTY_IMAGE_PATH");
  });

  it("should fail for whitespace-only string", () => {
    const error = validateImageForVideo("   ");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("EMPTY_IMAGE_PATH");
  });

  it("should fail for null", () => {
    const error = validateImageForVideo(null as unknown as Buffer);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_IMAGE_TYPE");
  });

  it("should fail for undefined", () => {
    const error = validateImageForVideo(undefined as unknown as Buffer);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_IMAGE_TYPE");
  });

  it("should fail for non-Buffer non-string", () => {
    const error = validateImageForVideo(123 as unknown as Buffer);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_IMAGE_TYPE");
  });

  it("should fail for buffer too large", () => {
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    largeBuffer[0] = 0xff;
    largeBuffer[1] = 0xd8;
    largeBuffer[2] = 0xff;
    const error = validateImageForVideo(largeBuffer);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("IMAGE_TOO_LARGE");
  });

  it("should fail for buffer too small", () => {
    const tinyBuffer = Buffer.from([0xff]);
    const error = validateImageForVideo(tinyBuffer);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("IMAGE_TOO_SMALL");
  });

  it("should fail for invalid image format", () => {
    const invalidBuffer = Buffer.from([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const error = validateImageForVideo(invalidBuffer);
    expect(error).not.toBeNull();
    expect(error?.code).toBe("INVALID_IMAGE_FORMAT");
  });
});

describe("validateVideoGenerationInput", () => {
  it("should pass for valid video generation options", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const options = {
      input: {
        text: "A smooth camera pan across a beautiful landscape",
        images: [jpeg],
      },
      output: {
        mode: "video" as const,
        video: { resolution: "1080p" as const },
      },
    };
    const result = validateVideoGenerationInput(options);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should fail when output.mode is not video", () => {
    const options = {
      input: { text: "prompt", images: [Buffer.from([0xff, 0xd8, 0xff])] },
      output: { mode: "text" as const },
    };
    const result = validateVideoGenerationInput(options);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_VIDEO_MODE")).toBe(
      true,
    );
  });

  it("should fail when no images provided", () => {
    const options = {
      input: { text: "prompt" },
      output: { mode: "video" as const },
    };
    const result = validateVideoGenerationInput(options);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === "MISSING_VIDEO_IMAGE")).toBe(
      true,
    );
  });

  it("should fail when image is invalid", () => {
    const invalidImage = Buffer.from([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const options = {
      input: { text: "prompt", images: [invalidImage] },
      output: { mode: "video" as const },
    };
    const result = validateVideoGenerationInput(options);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_IMAGE_FORMAT")).toBe(
      true,
    );
  });

  it("should warn when multiple images provided", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const options = {
      input: {
        text: "prompt",
        images: [jpeg, jpeg],
      },
      output: { mode: "video" as const },
    };
    const result = validateVideoGenerationInput(options);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("first image");
  });

  it("should fail for empty prompt", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const options = {
      input: { text: "", images: [jpeg] },
      output: { mode: "video" as const },
    };
    const result = validateVideoGenerationInput(options);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === "EMPTY_VIDEO_PROMPT")).toBe(
      true,
    );
  });

  it("should fail for whitespace-only prompt", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const options = {
      input: { text: "   ", images: [jpeg] },
      output: { mode: "video" as const },
    };
    const result = validateVideoGenerationInput(options);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === "EMPTY_VIDEO_PROMPT")).toBe(
      true,
    );
  });

  it("should fail for prompt exceeding max length", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const longPrompt = "a".repeat(501);
    const options = {
      input: { text: longPrompt, images: [jpeg] },
      output: { mode: "video" as const },
    };
    const result = validateVideoGenerationInput(options);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === "VIDEO_PROMPT_TOO_LONG")).toBe(
      true,
    );
  });

  it("should validate trimmed prompt length not untrimmed", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    // 490 spaces + 10 chars = 500 total, but only 10 after trim
    const prompt = `${" ".repeat(490)}valid text`;
    const options = {
      input: { text: prompt, images: [jpeg] },
      output: { mode: "video" as const },
    };
    const result = validateVideoGenerationInput(options);
    expect(result.isValid).toBe(true); // Should pass because trimmed length is 10
  });

  it("should fail for invalid video options", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const options = {
      input: { text: "prompt", images: [jpeg] },
      output: {
        mode: "video" as const,
        video: { resolution: "4K" as unknown as "720p" },
      },
    };
    const result = validateVideoGenerationInput(options);
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.code === "INVALID_VIDEO_RESOLUTION"),
    ).toBe(true);
  });
});

describe("validateTextGenerationOptions", () => {
  it("should pass for valid options", () => {
    const options = {
      prompt: "Test prompt",
      temperature: 0.7,
      maxTokens: 1000,
    };
    const result = validateTextGenerationOptions(options);
    expect(result.isValid).toBe(true);
  });

  it("should fail for missing prompt", () => {
    const options = { temperature: 0.7 };
    const result = validateTextGenerationOptions(options);
    expect(result.isValid).toBe(false);
  });

  it("should fail for temperature out of range", () => {
    const options = { prompt: "test", temperature: 3 };
    const result = validateTextGenerationOptions(options);
    expect(result.isValid).toBe(false);
  });
});

describe("validateStreamOptions", () => {
  it("should pass for valid stream options", () => {
    const options = {
      input: { text: "Test prompt" },
      temperature: 0.7,
    };
    const result = validateStreamOptions(options);
    expect(result.isValid).toBe(true);
  });

  it("should fail for missing input", () => {
    const options = { temperature: 0.7 };
    const result = validateStreamOptions(options);
    expect(result.isValid).toBe(false);
  });
});

describe("validateGenerateOptions", () => {
  it("should pass for valid generate options", () => {
    const options = {
      input: { text: "Test prompt" },
      temperature: 0.7,
    };
    const result = validateGenerateOptions(options);
    expect(result.isValid).toBe(true);
  });
});

describe("validateToolExecutionParams", () => {
  it("should pass for valid params object", () => {
    const result = validateToolExecutionParams("myTool", { key: "value" });
    expect(result.isValid).toBe(true);
  });

  it("should pass for undefined params", () => {
    const result = validateToolExecutionParams("myTool", undefined);
    expect(result.isValid).toBe(true);
  });

  it("should fail for non-object params", () => {
    const result = validateToolExecutionParams("myTool", "string");
    expect(result.isValid).toBe(false);
  });
});

describe("validateToolBatch", () => {
  it("should validate multiple tools", () => {
    const tools = {
      tool1: {
        name: "tool1",
        description: "Valid tool description with enough words",
        execute: async () => {},
      },
      tool2: {
        name: "tool2",
        description: "Another valid tool description here",
        execute: async () => {},
      },
    };
    const result = validateToolBatch(tools);
    expect(result.isValid).toBe(true);
    expect(result.validTools).toHaveLength(2);
    expect(result.invalidTools).toHaveLength(0);
  });

  it("should identify invalid tools", () => {
    const tools = {
      validTool: {
        name: "validTool",
        description: "Valid tool description with enough words",
        execute: async () => {},
      },
      invalidTool: {
        name: "123invalid",
        description: "short",
        execute: "not a function",
      },
    };
    const result = validateToolBatch(tools);
    expect(result.isValid).toBe(false);
    expect(result.validTools).toHaveLength(1);
    expect(result.invalidTools).toHaveLength(1);
    expect(result.invalidTools[0]).toBe("invalidTool");
  });
});

describe("Helper Functions", () => {
  describe("createValidationSummary", () => {
    it("should create summary with errors", () => {
      const result = {
        isValid: false,
        errors: [
          new ValidationError("Error 1"),
          new ValidationError("Error 2"),
        ],
        warnings: [],
        suggestions: [],
      };
      const summary = createValidationSummary(result);
      expect(summary).toContain("Error 1");
      expect(summary).toContain("Error 2");
    });

    it("should create summary with warnings", () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: ["Warning 1", "Warning 2"],
        suggestions: [],
      };
      const summary = createValidationSummary(result);
      expect(summary).toContain("Warning 1");
      expect(summary).toContain("Warning 2");
    });

    it("should create summary with suggestions", () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: ["Suggestion 1"],
      };
      const summary = createValidationSummary(result);
      expect(summary).toContain("Suggestion 1");
    });
  });

  describe("hasOnlyWarnings", () => {
    it("should return true for warnings without errors", () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: ["Warning"],
        suggestions: [],
      };
      expect(hasOnlyWarnings(result)).toBe(true);
    });

    it("should return false when errors present", () => {
      const result = {
        isValid: false,
        errors: [new ValidationError("Error")],
        warnings: ["Warning"],
        suggestions: [],
      };
      expect(hasOnlyWarnings(result)).toBe(false);
    });

    it("should return false when no warnings", () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      };
      expect(hasOnlyWarnings(result)).toBe(false);
    });
  });
});
