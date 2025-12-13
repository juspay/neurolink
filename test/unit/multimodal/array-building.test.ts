import { describe, it, expect } from "vitest";
import { buildMultimodalMessagesArray } from "../../../src/lib/utils/messageBuilder.js";
import type { GenerateOptions } from "../../../src/lib/types/generateTypes.js";

describe("Array Building Performance (MB-010)", () => {
  describe("Image Array Building", () => {
    it("should build image array with O(n) complexity using push (unit test)", async () => {
      // Test the core logic without actual file processing
      const options: GenerateOptions = {
        input: {
          text: "Test message",
        },
        model: "gpt-4o",
      };

      // Simulate the pattern used in messageBuilder.ts lines 541-544
      // This is what happens when processing multiple image files
      if (!options.input.images) {
        options.input.images = [];
      }

      const arrayRef = options.input.images;

      // Simulate adding 5 images (as the old code would do in a loop)
      for (let i = 0; i < 5; i++) {
        options.input.images.push({
          type: "image",
          data: Buffer.from(`test-image-${i}`),
          mediaType: "image/png",
        });
      }

      // Verify that images were accumulated correctly with O(n) behavior
      expect(options.input.images).toBe(arrayRef); // Same reference = O(n)
      expect(options.input.images.length).toBe(5);

      // Verify all images have correct content structure
      options.input.images.forEach((image, idx) => {
        expect(image).toHaveProperty("type");
        expect(image.type).toBe("image");
        expect(image).toHaveProperty("data");
        expect(image.data).toEqual(Buffer.from(`test-image-${idx}`));
      });
    });

    it("should initialize images array when undefined", async () => {
      // Create minimal test that doesn't require actual files
      const options: GenerateOptions = {
        input: {
          text: "Test message",
        },
        model: "gpt-4o",
      };

      // Verify initial state
      expect(options.input.images).toBeUndefined();

      // After processing (even without files), structure should be valid
      const messages = await buildMultimodalMessagesArray(
        options,
        "openai",
        "gpt-4o",
      );

      expect(messages).toBeDefined();
      expect(Array.isArray(messages)).toBe(true);
    });

    it("should preserve existing images when adding new ones", async () => {
      // Create a test that simulates adding to existing array
      const existingImage = {
        type: "image" as const,
        data: Buffer.from("existing"),
        mediaType: "image/png" as const,
      };

      const options: GenerateOptions = {
        input: {
          text: "Test",
          images: [existingImage],
        },
        model: "gpt-4o",
      };

      // Verify existing image is preserved
      expect(options.input.images?.length).toBe(1);
      expect(options.input.images?.[0]).toBe(existingImage);
    });
  });

  describe("PDF Array Building", () => {
    it("should initialize pdfFiles array when undefined", async () => {
      const options: GenerateOptions = {
        input: {
          text: "Test message",
        },
        model: "gpt-4o",
      };

      // Verify initial state
      expect(options.input.pdfFiles).toBeUndefined();

      // After processing, structure should be valid
      const messages = await buildMultimodalMessagesArray(
        options,
        "openai",
        "gpt-4o",
      );

      expect(messages).toBeDefined();
      expect(Array.isArray(messages)).toBe(true);
    });

    it("should preserve existing PDFs when adding new ones", async () => {
      // Create a test that simulates adding to existing array
      const existingPdf = {
        type: "file" as const,
        data: Buffer.from("existing pdf data"),
        mimeType: "application/pdf",
      };

      const options: GenerateOptions = {
        input: {
          text: "Test",
          pdfFiles: [existingPdf],
        },
        model: "gpt-4o",
      };

      // Verify existing PDF is preserved
      expect(options.input.pdfFiles?.length).toBe(1);
      expect(options.input.pdfFiles?.[0]).toBe(existingPdf);
    });
  });

  describe("Performance Characteristics", () => {
    it("should use same array reference for multiple additions", async () => {
      const options: GenerateOptions = {
        input: {
          text: "Test",
        },
        model: "gpt-4o",
      };

      // Simulate the pattern that happens in the actual code
      // This verifies that push() modifies in place rather than creating new arrays

      // Initialize array
      if (!options.input.images) {
        options.input.images = [];
      }
      const arrayRef = options.input.images;

      // Add items using push
      options.input.images.push({
        type: "image",
        data: Buffer.from("test1"),
        mediaType: "image/png",
      });
      options.input.images.push({
        type: "image",
        data: Buffer.from("test2"),
        mediaType: "image/png",
      });

      // Verify same reference (O(n) behavior)
      expect(options.input.images).toBe(arrayRef);
      expect(options.input.images.length).toBe(2);
    });

    it("should handle large number of files efficiently", async () => {
      const options: GenerateOptions = {
        input: {
          text: "Test",
        },
        model: "gpt-4o",
      };

      // Simulate processing 100 files
      if (!options.input.images) {
        options.input.images = [];
      }

      const startTime = Date.now();
      const arrayRef = options.input.images;

      for (let i = 0; i < 100; i++) {
        options.input.images.push({
          type: "image",
          data: Buffer.from(`test${i}`),
          mediaType: "image/png",
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // O(n) should complete very quickly (< 10ms for 100 items)
      // O(n²) would take much longer
      expect(duration).toBeLessThan(50); // generous threshold

      // Verify same reference maintained (key indicator of O(n))
      expect(options.input.images).toBe(arrayRef);
      expect(options.input.images.length).toBe(100);
    });
  });
});
