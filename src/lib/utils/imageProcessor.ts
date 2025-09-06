/**
 * Image processing utilities for multimodal support
 * Handles format conversion for different AI providers
 */

import { logger } from "./logger.js";
import type { ProcessedImage } from "../types/content.js";

/**
 * Image processor class for handling provider-specific image formatting
 */
export class ImageProcessor {
  /**
   * Process image for OpenAI (requires data URI format)
   */
  static processImageForOpenAI(image: Buffer | string): string {
    try {
      if (typeof image === "string") {
        // Handle URLs
        if (image.startsWith("http")) {
          return image;
        }
        // Handle data URIs
        if (image.startsWith("data:")) {
          return image;
        }
        // Handle base64 - convert to data URI
        return `data:image/jpeg;base64,${image}`;
      }

      // Handle Buffer - convert to data URI
      const base64 = image.toString("base64");
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      logger.error("Failed to process image for OpenAI:", error);
      throw new Error(
        `Image processing failed for OpenAI: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Process image for Google AI (requires base64 without data URI prefix)
   */
  static processImageForGoogle(image: Buffer | string): {
    mimeType: string;
    data: string;
  } {
    try {
      let base64Data: string;
      let mimeType = "image/jpeg"; // Default

      if (typeof image === "string") {
        if (image.startsWith("data:")) {
          // Extract mime type and base64 from data URI
          const match = image.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            base64Data = match[2];
          } else {
            base64Data = image.split(",")[1] || image;
          }
        } else {
          base64Data = image;
        }
      } else {
        base64Data = image.toString("base64");
      }

      return {
        mimeType,
        data: base64Data, // Google wants base64 WITHOUT data URI prefix
      };
    } catch (error) {
      logger.error("Failed to process image for Google AI:", error);
      throw new Error(
        `Image processing failed for Google AI: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Process image for Anthropic (requires base64 without data URI prefix)
   */
  static processImageForAnthropic(image: Buffer | string): {
    mediaType: string;
    data: string;
  } {
    try {
      let base64Data: string;
      let mediaType = "image/jpeg"; // Default

      if (typeof image === "string") {
        if (image.startsWith("data:")) {
          // Extract mime type and base64 from data URI
          const match = image.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mediaType = match[1];
            base64Data = match[2];
          } else {
            base64Data = image.split(",")[1] || image;
          }
        } else {
          base64Data = image;
        }
      } else {
        base64Data = image.toString("base64");
      }

      return {
        mediaType,
        data: base64Data, // Anthropic wants base64 WITHOUT data URI prefix
      };
    } catch (error) {
      logger.error("Failed to process image for Anthropic:", error);
      throw new Error(
        `Image processing failed for Anthropic: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Process image for Vertex AI (model-specific routing)
   */
  static processImageForVertex(
    image: Buffer | string,
    model: string,
  ): { mimeType?: string; mediaType?: string; data: string } {
    try {
      // Route based on model type
      if (model.includes("gemini")) {
        // Use Google AI format for Gemini models
        return ImageProcessor.processImageForGoogle(image);
      } else if (model.includes("claude")) {
        // Use Anthropic format for Claude models
        return ImageProcessor.processImageForAnthropic(image);
      } else {
        // Default to Google format
        return ImageProcessor.processImageForGoogle(image);
      }
    } catch (error) {
      logger.error("Failed to process image for Vertex AI:", error);
      throw new Error(
        `Image processing failed for Vertex AI: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Detect image type from filename or data
   */
  static detectImageType(input: string | Buffer): string {
    try {
      if (typeof input === "string") {
        // Check if it's a data URI
        if (input.startsWith("data:")) {
          const match = input.match(/^data:([^;]+);/);
          return match ? match[1] : "image/jpeg";
        }

        // Check if it's a filename
        const extension = input.toLowerCase().split(".").pop();
        const imageTypes: Record<string, string> = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          gif: "image/gif",
          webp: "image/webp",
          bmp: "image/bmp",
          tiff: "image/tiff",
          tif: "image/tiff",
        };
        return imageTypes[extension || ""] || "image/jpeg";
      }

      // For Buffer, try to detect from magic bytes
      if (input.length >= 4) {
        const header = input.subarray(0, 4);

        // PNG: 89 50 4E 47
        if (
          header[0] === 0x89 &&
          header[1] === 0x50 &&
          header[2] === 0x4e &&
          header[3] === 0x47
        ) {
          return "image/png";
        }

        // JPEG: FF D8 FF
        if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
          return "image/jpeg";
        }

        // GIF: 47 49 46 38
        if (
          header[0] === 0x47 &&
          header[1] === 0x49 &&
          header[2] === 0x46 &&
          header[3] === 0x38
        ) {
          return "image/gif";
        }

        // WebP: check for RIFF and WEBP
        if (input.length >= 12) {
          const riff = input.subarray(0, 4);
          const webp = input.subarray(8, 12);
          if (riff.toString() === "RIFF" && webp.toString() === "WEBP") {
            return "image/webp";
          }
        }
      }

      return "image/jpeg"; // Default fallback
    } catch (error) {
      logger.warn("Failed to detect image type, using default:", error);
      return "image/jpeg";
    }
  }

  /**
   * Validate image size (default 10MB limit)
   */
  static validateImageSize(
    data: Buffer | string,
    maxSize: number = 10 * 1024 * 1024,
  ): boolean {
    try {
      const size =
        typeof data === "string"
          ? Buffer.byteLength(data, "base64")
          : data.length;
      return size <= maxSize;
    } catch (error) {
      logger.warn("Failed to validate image size:", error);
      return false;
    }
  }

  /**
   * Validate image format
   */
  static validateImageFormat(mediaType: string): boolean {
    const supportedFormats = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/tiff",
    ];
    return supportedFormats.includes(mediaType.toLowerCase());
  }

  /**
   * Get image dimensions from Buffer (basic implementation)
   */
  static getImageDimensions(
    buffer: Buffer,
  ): { width: number; height: number } | null {
    try {
      // Basic PNG dimension extraction
      if (
        buffer.length >= 24 &&
        buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
      ) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }

      // Basic JPEG dimension extraction (simplified)
      if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
        // This is a very basic implementation
        // For production, consider using a proper image library
        return null;
      }

      return null;
    } catch (error) {
      logger.warn("Failed to extract image dimensions:", error);
      return null;
    }
  }

  /**
   * Convert image to ProcessedImage format
   */
  static processImage(
    image: Buffer | string,
    provider: string,
    model?: string,
  ): ProcessedImage {
    try {
      const mediaType = ImageProcessor.detectImageType(image);
      const size =
        typeof image === "string"
          ? Buffer.byteLength(image, "base64")
          : image.length;

      let data: string;
      let format: ProcessedImage["format"];

      switch (provider.toLowerCase()) {
        case "openai":
          data = ImageProcessor.processImageForOpenAI(image);
          format = "data_uri";
          break;

        case "google-ai":
        case "google": {
          const googleResult = ImageProcessor.processImageForGoogle(image);
          data = googleResult.data;
          format = "base64";
          break;
        }

        case "anthropic": {
          const anthropicResult =
            ImageProcessor.processImageForAnthropic(image);
          data = anthropicResult.data;
          format = "base64";
          break;
        }

        case "vertex": {
          const vertexResult = ImageProcessor.processImageForVertex(
            image,
            model || "",
          );
          data = vertexResult.data;
          format = "base64";
          break;
        }

        default:
          // Default to base64
          if (typeof image === "string") {
            data = image.startsWith("data:")
              ? image.split(",")[1] || image
              : image;
          } else {
            data = image.toString("base64");
          }
          format = "base64";
      }

      return {
        data,
        mediaType,
        size,
        format,
      };
    } catch (error) {
      logger.error(`Failed to process image for ${provider}:`, error);
      throw new Error(
        `Image processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

/**
 * Utility functions for image handling
 */
export const imageUtils = {
  /**
   * Check if a string is a valid data URI
   */
  isDataUri: (str: string): boolean => {
    return (
      typeof str === "string" &&
      str.startsWith("data:") &&
      str.includes("base64,")
    );
  },

  /**
   * Check if a string is a valid URL
   */
  isUrl: (str: string): boolean => {
    try {
      new URL(str);
      return str.startsWith("http://") || str.startsWith("https://");
    } catch {
      return false;
    }
  },

  /**
   * Check if a string is base64 encoded
   */
  isBase64: (str: string): boolean => {
    try {
      return btoa(atob(str)) === str;
    } catch {
      return false;
    }
  },

  /**
   * Extract file extension from filename or URL
   */
  getFileExtension: (filename: string): string | null => {
    const match = filename.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : null;
  },

  /**
   * Convert file size to human readable format
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) {
      return "0 Bytes";
    }
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },
};
