/**
 * Message Builder Utility
 * Centralized logic for building message arrays from TextGenerationOptions
 * Enhanced with multimodal support for images
 */

import type {
  ChatMessage,
  MultimodalChatMessage,
  MessageContent,
} from "../types/conversationTypes.js";
import type { TextGenerationOptions } from "../core/types.js";
import type { StreamOptions } from "../types/streamTypes.js";
import type { GenerateOptions } from "../types/generateTypes.js";
import type { Content } from "../types/content.js";
import { CONVERSATION_INSTRUCTIONS } from "../config/conversationMemoryConfig.js";
import {
  ProviderImageAdapter,
  MultimodalLogger,
} from "../adapters/providerImageAdapter.js";
import { logger } from "./logger.js";
import { request } from "undici";
import { readFileSync, existsSync } from "fs";

/**
 * Build a properly formatted message array for AI providers
 * Combines system prompt, conversation history, and current user prompt
 * Supports both TextGenerationOptions and StreamOptions
 */
export function buildMessagesArray(
  options: TextGenerationOptions | StreamOptions,
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  // Check if conversation history exists
  const hasConversationHistory =
    options.conversationMessages && options.conversationMessages.length > 0;

  // Build enhanced system prompt
  let systemPrompt = options.systemPrompt?.trim() || "";

  // Add conversation-aware instructions when history exists
  if (hasConversationHistory) {
    systemPrompt = `${systemPrompt.trim()}${CONVERSATION_INSTRUCTIONS}`;
  }

  // Add system message if we have one
  if (systemPrompt.trim()) {
    messages.push({
      role: "system",
      content: systemPrompt.trim(),
    });
  }

  // Add conversation history if available
  if (hasConversationHistory && options.conversationMessages) {
    messages.push(...options.conversationMessages);
  }

  // Add current user prompt (required)
  // Handle both TextGenerationOptions (prompt field) and StreamOptions (input.text field)
  let currentPrompt: string | undefined;

  if ("prompt" in options && options.prompt) {
    currentPrompt = options.prompt;
  } else if ("input" in options && options.input?.text) {
    currentPrompt = options.input.text;
  }

  if (currentPrompt?.trim()) {
    messages.push({
      role: "user",
      content: currentPrompt.trim(),
    });
  }

  return messages;
}

/**
 * Build multimodal message array with image support
 * Detects when images are present and routes through provider adapter
 */
export async function buildMultimodalMessagesArray(
  options: GenerateOptions,
  provider: string,
  model: string,
): Promise<MultimodalChatMessage[]> {
  // Check if this is a multimodal request
  const hasImages =
    (options.input.images && options.input.images.length > 0) ||
    (options.input.content &&
      options.input.content.some((c) => c.type === "image"));

  // If no images, use standard message building and convert to MultimodalChatMessage[]
  if (!hasImages) {
    const standardMessages = buildMessagesArray(
      options as TextGenerationOptions,
    );
    return standardMessages.map((msg) => ({ ...msg, content: msg.content }));
  }

  // Validate provider supports vision
  if (!ProviderImageAdapter.supportsVision(provider, model)) {
    throw new Error(
      `Provider ${provider} with model ${model} does not support vision processing. ` +
        `Supported providers: ${ProviderImageAdapter.getVisionProviders().join(", ")}`,
    );
  }

  const messages: MultimodalChatMessage[] = [];

  // Build enhanced system prompt
  let systemPrompt = options.systemPrompt?.trim() || "";

  // Add conversation-aware instructions when history exists
  const hasConversationHistory =
    options.conversationHistory && options.conversationHistory.length > 0;
  if (hasConversationHistory) {
    systemPrompt = `${systemPrompt.trim()}${CONVERSATION_INSTRUCTIONS}`;
  }

  // Add system message if we have one
  if (systemPrompt.trim()) {
    messages.push({
      role: "system",
      content: systemPrompt.trim(),
    });
  }

  // Add conversation history if available
  if (hasConversationHistory && options.conversationHistory) {
    // Convert conversation history to MultimodalChatMessage format
    options.conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      });
    });
  }

  // Handle multimodal content
  try {
    let userContent: string | unknown;

    if (options.input.content && options.input.content.length > 0) {
      // Advanced content format - convert to provider-specific format
      userContent = await convertContentToProviderFormat(
        options.input.content,
        provider,
        model,
      );
    } else if (options.input.images && options.input.images.length > 0) {
      // Simple images format - convert to provider-specific format
      userContent = await convertSimpleImagesToProviderFormat(
        options.input.text,
        options.input.images,
        provider,
        model,
      );
    } else {
      // Text-only fallback
      userContent = options.input.text;
    }

    // 🔧 CRITICAL FIX: Handle multimodal content properly for Vercel AI SDK
    if (typeof userContent === "string") {
      // Simple text content - use standard MultimodalChatMessage format
      messages.push({
        role: "user",
        content: userContent,
      });
    } else {
      // 🔧 MULTIMODAL CONTENT: Wrap the content array in a proper message object
      // The Vercel AI SDK expects messages with multimodal content arrays
      messages.push({
        role: "user",
        content: userContent as MessageContent[],
      });
    }

    return messages;
  } catch (error) {
    MultimodalLogger.logError("MULTIMODAL_BUILD", error as Error, {
      provider,
      model,
      hasImages,
      imageCount: options.input.images?.length || 0,
    });
    throw error;
  }
}

/**
 * Convert advanced content format to provider-specific format
 */
async function convertContentToProviderFormat(
  content: Content[],
  provider: string,
  _model: string,
): Promise<unknown> {
  const textContent = content.find((c) => c.type === "text");
  const imageContent = content.filter((c) => c.type === "image");

  if (!textContent) {
    throw new Error(
      "Multimodal content must include at least one text element",
    );
  }

  if (imageContent.length === 0) {
    return textContent.text;
  }

  // Extract images as Buffer | string array
  const images = imageContent.map((img) => img.data);

  return await convertSimpleImagesToProviderFormat(
    textContent.text,
    images,
    provider,
    _model,
  );
}

/**
 * Check if a string is an internet URL
 */
function isInternetUrl(input: string): boolean {
  return input.startsWith("http://") || input.startsWith("https://");
}

/**
 * Download image from URL and convert to base64 data URI
 */
async function downloadImageFromUrl(url: string): Promise<string> {
  try {
    const response = await request(url, {
      method: "GET",
      headersTimeout: 10000, // 10 second timeout for headers
      bodyTimeout: 30000, // 30 second timeout for body
      maxRedirections: 5,
    });

    if (response.statusCode !== 200) {
      throw new Error(
        `HTTP ${response.statusCode}: Failed to download image from ${url}`,
      );
    }

    // Get content type from headers
    const contentType =
      (response.headers["content-type"] as string) || "image/jpeg";

    // Validate it's an image
    if (!contentType.startsWith("image/")) {
      throw new Error(
        `URL does not point to an image. Content-Type: ${contentType}`,
      );
    }

    // Read the response body
    const chunks: Buffer[] = [];
    for await (const chunk of response.body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (buffer.length > maxSize) {
      throw new Error(
        `Image too large: ${buffer.length} bytes (max: ${maxSize} bytes)`,
      );
    }

    // Convert to base64 data URI
    const base64 = buffer.toString("base64");
    const dataUri = `data:${contentType};base64,${base64}`;

    return dataUri;
  } catch (error) {
    MultimodalLogger.logError("URL_DOWNLOAD_FAILED", error as Error, { url });
    throw new Error(
      `Failed to download image from ${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Convert simple images format to Vercel AI SDK format with smart auto-detection
 * - URLs: Downloaded and converted to base64 for Vercel AI SDK compatibility
 * - Local files: Converted to base64 for Vercel AI SDK compatibility
 * - Buffers/Data URIs: Processed normally
 */
async function convertSimpleImagesToProviderFormat(
  text: string,
  images: Array<Buffer | string>,
  provider: string,
  _model: string,
): Promise<unknown> {
  // For Vercel AI SDK, we need to return the content in the standard format
  // The Vercel AI SDK will handle provider-specific formatting internally

  // Smart auto-detection: separate URLs from actual image data
  const urlImages: string[] = [];
  const actualImages: Array<Buffer | string> = [];

  images.forEach((image, _index) => {
    if (typeof image === "string" && isInternetUrl(image)) {
      // Internet URL - will be downloaded and converted to base64
      urlImages.push(image);
    } else {
      // Actual image data (file path, Buffer, data URI) - process for Vercel AI SDK
      actualImages.push(image);
    }
  });

  // Download URL images and add to actual images
  for (const url of urlImages) {
    try {
      const downloadedDataUri = await downloadImageFromUrl(url);
      actualImages.push(downloadedDataUri);
    } catch (error) {
      MultimodalLogger.logError(
        "URL_DOWNLOAD_FAILED_SKIPPING",
        error as Error,
        { url },
      );
      // Continue processing other images even if one URL fails
      logger.warn(
        `Failed to download image from ${url}, skipping: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const content: Array<{
    type: string;
    text?: string;
    image?: string;
    mimeType?: string;
  }> = [{ type: "text", text }];

  // Process all images (including downloaded URLs) for Vercel AI SDK
  actualImages.forEach((image, index) => {
    try {
      // Vercel AI SDK expects { type: 'image', image: Buffer | string, mimeType?: string }
      // For Vertex AI, we need to include mimeType
      let imageData: string;
      let mimeType = "image/jpeg"; // Default mime type

      if (typeof image === "string") {
        if (image.startsWith("data:")) {
          // Data URI (including downloaded URLs) - extract mime type and use directly
          const match = image.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            imageData = image; // Keep as data URI for Vercel AI SDK
          } else {
            imageData = image;
          }
        } else if (isInternetUrl(image)) {
          // This should not happen as URLs are processed separately above
          // But handle it gracefully just in case
          throw new Error(`Unprocessed URL found in actualImages: ${image}`);
        } else {
          // File path string - convert to base64 data URI
          try {
            if (existsSync(image)) {
              const buffer = readFileSync(image);
              const base64 = buffer.toString("base64");

              // Detect mime type from file extension
              const ext = image.toLowerCase().split(".").pop();
              switch (ext) {
                case "png":
                  mimeType = "image/png";
                  break;
                case "gif":
                  mimeType = "image/gif";
                  break;
                case "webp":
                  mimeType = "image/webp";
                  break;
                case "bmp":
                  mimeType = "image/bmp";
                  break;
                case "tiff":
                case "tif":
                  mimeType = "image/tiff";
                  break;
                default:
                  mimeType = "image/jpeg";
                  break;
              }

              imageData = `data:${mimeType};base64,${base64}`;
            } else {
              throw new Error(`Image file not found: ${image}`);
            }
          } catch (error) {
            MultimodalLogger.logError("FILE_PATH_CONVERSION", error as Error, {
              index,
              filePath: image,
            });
            throw new Error(
              `Failed to convert file path to base64: ${image}. ${error}`,
            );
          }
        }
      } else {
        // Buffer - convert to base64 data URI
        const base64 = image.toString("base64");
        imageData = `data:${mimeType};base64,${base64}`;
      }

      content.push({
        type: "image",
        image: imageData,
        mimeType: mimeType, // Add mimeType for Vertex AI compatibility
      });
    } catch (error) {
      MultimodalLogger.logError("ADD_IMAGE_TO_CONTENT", error as Error, {
        index,
        provider,
      });
      throw error;
    }
  });

  return content;
}
