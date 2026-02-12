/**
 * Message Builder Module
 *
 * Handles all message construction logic for AI providers.
 * Extracted from BaseProvider to follow Single Responsibility Principle.
 *
 * Responsibilities:
 * - Building messages from text generation options
 * - Building messages from stream options
 * - Multimodal input detection
 * - Message format conversion (to CoreMessage[])
 *
 * @module core/modules/MessageBuilder
 */

import type { CoreMessage } from "ai";
import type {
  AIProviderName,
  TextGenerationOptions,
} from "../../types/index.js";
import type { MultimodalInput } from "../../types/multimodal.js";
import type { StreamOptions } from "../../types/streamTypes.js";
import { logger } from "../../utils/logger.js";
import {
  buildMessagesArray,
  buildMultimodalMessagesArray,
} from "../../utils/messageBuilder.js";

/**
 * MessageBuilder class - Handles message construction for AI providers
 */
export class MessageBuilder {
  constructor(
    private readonly providerName: AIProviderName,
    private readonly modelName: string,
  ) {}

  /**
   * Build messages array for generation
   * Detects multimodal input and routes to appropriate message builder
   */
  async buildMessages(options: TextGenerationOptions): Promise<CoreMessage[]> {
    const hasMultimodalInput = (opts: TextGenerationOptions): boolean => {
      const input = opts.input as MultimodalInput | undefined;
      const hasImages = !!input?.images?.length;
      const hasContent = !!input?.content?.length;
      const hasCSVFiles = !!input?.csvFiles?.length;
      const hasPdfFiles = !!input?.pdfFiles?.length;
      const hasFiles = !!input?.files?.length;
      return hasImages || hasContent || hasCSVFiles || hasPdfFiles || hasFiles;
    };

    let messages;
    if (hasMultimodalInput(options)) {
      if (process.env.NEUROLINK_DEBUG === "true") {
        logger.debug(
          "Detected multimodal input, using multimodal message builder",
        );
      }

      const input = options.input as MultimodalInput | undefined;
      const multimodalOptions = {
        input: {
          text: options.prompt || options.input?.text || "",
          images: input?.images,
          content: input?.content,
          csvFiles: input?.csvFiles,
          pdfFiles: input?.pdfFiles,
          files: input?.files,
        },
        csvOptions: options.csvOptions,
        provider: options.provider,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        systemPrompt: options.systemPrompt,
        enableAnalytics: options.enableAnalytics,
        enableEvaluation: options.enableEvaluation,
        context: options.context,
        conversationHistory: options.conversationMessages,
        schema: options.schema,
        output: options.output,
        fileRegistry: options.fileRegistry,
      };

      messages = await buildMultimodalMessagesArray(
        multimodalOptions,
        this.providerName,
        this.modelName,
      );
    } else {
      if (process.env.NEUROLINK_DEBUG === "true") {
        logger.debug(
          "No multimodal input detected, using standard message builder",
        );
      }
      messages = await buildMessagesArray(options);
    }

    // Convert messages to Vercel AI SDK format
    return messages.map((msg) => {
      if (typeof msg.content === "string") {
        return {
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        } as CoreMessage;
      } else {
        return {
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content.map((item) => {
            if (item.type === "text") {
              return { type: "text", text: item.text || "" };
            } else if (item.type === "image") {
              return { type: "image", image: item.image || "" };
            }
            return item;
          }),
        } as CoreMessage;
      }
    });
  }

  /**
   * Build messages array for streaming operations
   * This is a protected helper method that providers can use to build messages
   * with automatic multimodal detection, eliminating code duplication
   *
   * @param options - Stream options or text generation options
   * @returns Promise resolving to CoreMessage array ready for AI SDK
   */
  async buildMessagesForStream(
    options: StreamOptions | TextGenerationOptions,
  ): Promise<CoreMessage[]> {
    // Detect multimodal input
    const hasMultimodalInput = (
      opts: StreamOptions | TextGenerationOptions,
    ): boolean => {
      const input = opts.input as MultimodalInput | undefined;
      const hasImages = !!input?.images?.length;
      const hasContent = !!input?.content?.length;
      const hasCSVFiles = !!input?.csvFiles?.length;
      const hasPdfFiles = !!input?.pdfFiles?.length;
      const hasFiles = !!input?.files?.length;
      return hasImages || hasContent || hasCSVFiles || hasPdfFiles || hasFiles;
    };

    let messages;
    if (hasMultimodalInput(options)) {
      if (process.env.NEUROLINK_DEBUG === "true") {
        logger.debug(
          `${this.providerName}: Detected multimodal input, using multimodal message builder`,
        );
      }

      const input = options.input as MultimodalInput | undefined;
      const multimodalOptions = {
        input: {
          text:
            (options as TextGenerationOptions).prompt ||
            options.input?.text ||
            "",
          images: input?.images,
          content: input?.content,
          csvFiles: input?.csvFiles,
          pdfFiles: input?.pdfFiles,
          files: input?.files,
        },
        csvOptions: options.csvOptions,
        provider: options.provider,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        systemPrompt: options.systemPrompt,
        enableAnalytics: options.enableAnalytics,
        enableEvaluation: options.enableEvaluation,
        context: options.context,
        conversationHistory: (options as TextGenerationOptions)
          .conversationMessages,
        schema: options.schema,
        output: options.output,
        fileRegistry: (options as Record<string, unknown>).fileRegistry,
      };

      messages = await buildMultimodalMessagesArray(
        multimodalOptions,
        this.providerName,
        this.modelName,
      );
    } else {
      if (process.env.NEUROLINK_DEBUG === "true") {
        logger.debug(
          `${this.providerName}: No multimodal input detected, using standard message builder`,
        );
      }
      messages = await buildMessagesArray(options);
    }

    // Convert messages to Vercel AI SDK format
    return messages.map((msg) => {
      if (typeof msg.content === "string") {
        return {
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        } as CoreMessage;
      } else {
        return {
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content.map((item) => {
            if (item.type === "text") {
              return { type: "text", text: item.text || "" };
            } else if (item.type === "image") {
              return { type: "image", image: item.image || "" };
            }
            return item;
          }),
        } as CoreMessage;
      }
    });
  }
}
