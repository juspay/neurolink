/**
 * Video Options Type Tests
 *
 * Tests for VIDEO-017: Add videoOptions to GenerateOptions
 * Verifies that:
 * - VideoProcessorOptions type is properly defined
 * - videoOptions field exists in GenerateOptions
 * - Type is optional
 * - All fields are correctly typed
 */

import { describe, it, expect } from "vitest";
import type { GenerateOptions, VideoProcessorOptions } from "../../../src/lib/types/index.js";

describe("VIDEO-017: videoOptions in GenerateOptions", () => {
  describe("VideoProcessorOptions type", () => {
    it("should accept valid VideoProcessorOptions", () => {
      const validOptions: VideoProcessorOptions = {
        frameCount: 10,
        format: "jpeg",
        quality: 85,
        transcribe: true,
        transcriptionModel: "whisper-1",
      };

      expect(validOptions).toBeDefined();
      expect(validOptions.frameCount).toBe(10);
      expect(validOptions.format).toBe("jpeg");
      expect(validOptions.quality).toBe(85);
      expect(validOptions.transcribe).toBe(true);
      expect(validOptions.transcriptionModel).toBe("whisper-1");
    });

    it("should accept partial VideoProcessorOptions", () => {
      const partialOptions: VideoProcessorOptions = {
        frameCount: 5,
      };

      expect(partialOptions).toBeDefined();
      expect(partialOptions.frameCount).toBe(5);
    });

    it("should accept empty VideoProcessorOptions", () => {
      const emptyOptions: VideoProcessorOptions = {};

      expect(emptyOptions).toBeDefined();
    });

    it("should enforce format type as jpeg or png", () => {
      const jpegOptions: VideoProcessorOptions = {
        format: "jpeg",
      };
      const pngOptions: VideoProcessorOptions = {
        format: "png",
      };

      expect(jpegOptions.format).toBe("jpeg");
      expect(pngOptions.format).toBe("png");
    });
  });

  describe("GenerateOptions with videoOptions", () => {
    it("should accept GenerateOptions with videoOptions", () => {
      const options: GenerateOptions = {
        input: {
          text: "Analyze this video",
          videoFiles: [Buffer.from("video-data")],
        },
        videoOptions: {
          frameCount: 8,
          format: "jpeg",
          quality: 90,
          transcribe: true,
          transcriptionModel: "whisper-1",
        },
      };

      expect(options).toBeDefined();
      expect(options.videoOptions).toBeDefined();
      expect(options.videoOptions?.frameCount).toBe(8);
      expect(options.videoOptions?.format).toBe("jpeg");
      expect(options.videoOptions?.quality).toBe(90);
      expect(options.videoOptions?.transcribe).toBe(true);
      expect(options.videoOptions?.transcriptionModel).toBe("whisper-1");
    });

    it("should accept GenerateOptions without videoOptions", () => {
      const options: GenerateOptions = {
        input: {
          text: "Simple text query",
        },
      };

      expect(options).toBeDefined();
      expect(options.videoOptions).toBeUndefined();
    });

    it("should allow videoOptions with only specific fields", () => {
      const optionsWithFrameCount: GenerateOptions = {
        input: {
          text: "Analyze video frames",
          videoFiles: [Buffer.from("video-data")],
        },
        videoOptions: {
          frameCount: 12,
        },
      };

      expect(optionsWithFrameCount.videoOptions).toBeDefined();
      expect(optionsWithFrameCount.videoOptions?.frameCount).toBe(12);

      const optionsWithTranscription: GenerateOptions = {
        input: {
          text: "Transcribe this video",
          videoFiles: [Buffer.from("video-data")],
        },
        videoOptions: {
          transcribe: true,
          transcriptionModel: "whisper-1",
        },
      };

      expect(optionsWithTranscription.videoOptions).toBeDefined();
      expect(optionsWithTranscription.videoOptions?.transcribe).toBe(true);
      expect(optionsWithTranscription.videoOptions?.transcriptionModel).toBe("whisper-1");
    });

    it("should work with other GenerateOptions fields", () => {
      const options: GenerateOptions = {
        input: {
          text: "Analyze this video with tools",
          videoFiles: [Buffer.from("video-data")],
        },
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.7,
        maxTokens: 1000,
        videoOptions: {
          frameCount: 6,
          quality: 80,
          transcribe: false,
        },
        csvOptions: {
          maxRows: 100,
        },
      };

      expect(options).toBeDefined();
      expect(options.provider).toBe("openai");
      expect(options.model).toBe("gpt-4o");
      expect(options.temperature).toBe(0.7);
      expect(options.maxTokens).toBe(1000);
      expect(options.videoOptions).toBeDefined();
      expect(options.videoOptions?.frameCount).toBe(6);
      expect(options.videoOptions?.quality).toBe(80);
      expect(options.videoOptions?.transcribe).toBe(false);
    });
  });

  describe("Type compatibility", () => {
    it("should maintain backward compatibility", () => {
      // Options without videoOptions should still work
      const oldStyleOptions: GenerateOptions = {
        input: {
          text: "Old style query",
        },
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
      };

      expect(oldStyleOptions).toBeDefined();
      expect(oldStyleOptions.videoOptions).toBeUndefined();
    });

    it("should not break existing GenerateOptions fields", () => {
      const options: GenerateOptions = {
        input: {
          text: "Test all fields",
          images: [Buffer.from("image")],
          csvFiles: [Buffer.from("csv")],
          pdfFiles: [Buffer.from("pdf")],
          videoFiles: [Buffer.from("video")],
        },
        provider: "google-ai",
        model: "gemini-2.0-flash-exp",
        temperature: 0.5,
        maxTokens: 2000,
        systemPrompt: "You are a helpful assistant",
        csvOptions: {
          maxRows: 50,
          formatStyle: "markdown",
        },
        videoOptions: {
          frameCount: 10,
          format: "png",
          quality: 95,
        },
      };

      expect(options).toBeDefined();
      expect(options.input.text).toBe("Test all fields");
      expect(options.input.images).toBeDefined();
      expect(options.input.csvFiles).toBeDefined();
      expect(options.input.pdfFiles).toBeDefined();
      expect(options.input.videoFiles).toBeDefined();
      expect(options.provider).toBe("google-ai");
      expect(options.csvOptions).toBeDefined();
      expect(options.videoOptions).toBeDefined();
    });
  });
});
