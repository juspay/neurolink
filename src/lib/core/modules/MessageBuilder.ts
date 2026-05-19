import { tracers, ATTR, withSpan } from "../../telemetry/index.js";
import type {
  AIProviderName,
  TextGenerationOptions,
  MultimodalInput,
  MultimodalChatMessage,
  StreamOptions,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import {
  buildMessagesArray,
  buildMultimodalMessagesArray,
} from "../../utils/messageBuilder.js";
import type { ModelMessage } from "../../types/index.js";

/**
 * Compute total content length across all messages for span attributes.
 */
function computeTotalContentLength(messages: ModelMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      total += msg.content.length;
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (
          "text" in part &&
          typeof (part as { text: unknown }).text === "string"
        ) {
          total += (part as { text: string }).text.length;
        }
      }
    }
  }
  return total;
}

/**
 * Check whether input contains multimodal content (images, files, PDFs, CSVs).
 */
function detectMultimodal(opts: TextGenerationOptions | StreamOptions): {
  isMultimodal: boolean;
  hasImages: boolean;
  hasFiles: boolean;
} {
  const input = opts.input as MultimodalInput | undefined;
  const hasImages = !!input?.images?.length;
  const hasContent = !!input?.content?.length;
  const hasCSVFiles = !!input?.csvFiles?.length;
  const hasPdfFiles = !!input?.pdfFiles?.length;
  const hasFiles = !!input?.files?.length;
  return {
    isMultimodal:
      hasImages || hasContent || hasCSVFiles || hasPdfFiles || hasFiles,
    hasImages,
    hasFiles: hasCSVFiles || hasPdfFiles || hasFiles,
  };
}

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
  async buildMessages(options: TextGenerationOptions): Promise<ModelMessage[]> {
    return withSpan(
      {
        name: "neurolink.message.build",
        tracer: tracers.sdk,
        attributes: {
          [ATTR.NL_PROVIDER]: this.providerName,
          [ATTR.NL_MODEL]: this.modelName,
        },
      },
      async (span) => {
        const { isMultimodal, hasImages, hasFiles } = detectMultimodal(options);
        span.setAttribute(ATTR.MSG_IS_MULTIMODAL, isMultimodal);

        let messages: ModelMessage[] | MultimodalChatMessage[];
        if (isMultimodal) {
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
          // Propagate any systemPrompt augmentation (e.g. inline-file
          // handling guidance from processUnifiedFilesArray) back to the
          // caller's options. Providers like GoogleVertex's native
          // @google/genai stream path read `options.systemPrompt` directly
          // — without this propagation the augmentation lives only on the
          // local `multimodalOptions` clone and never reaches the model.
          if (
            multimodalOptions.systemPrompt &&
            multimodalOptions.systemPrompt !== options.systemPrompt
          ) {
            options.systemPrompt = multimodalOptions.systemPrompt;
          }
        } else {
          if (process.env.NEUROLINK_DEBUG === "true") {
            logger.debug(
              "No multimodal input detected, using standard message builder",
            );
          }
          messages = await buildMessagesArray(options);
        }

        // Convert messages to Vercel AI SDK format
        // Preserve providerOptions (e.g. Anthropic cache_control) through conversion
        const coreMessages = messages.map((msg) => {
          const providerOptions = (msg as Record<string, unknown>)
            .providerOptions as Record<string, unknown> | undefined;
          if (typeof msg.content === "string") {
            return {
              role: msg.role as "user" | "assistant" | "system",
              content: msg.content,
              ...(providerOptions && { providerOptions }),
            } as ModelMessage;
          } else {
            return {
              role: msg.role as "user" | "assistant" | "system",
              content: (msg.content as Array<Record<string, unknown>>).map(
                (item) => {
                  const itemProviderOptions = item.providerOptions as
                    | Record<string, unknown>
                    | undefined;
                  if (item.type === "text") {
                    return {
                      type: "text" as const,
                      text: (item.text as string) || "",
                      ...(itemProviderOptions && {
                        providerOptions: itemProviderOptions,
                      }),
                    };
                  } else if (item.type === "image") {
                    return {
                      type: "image" as const,
                      image: (item.image as string) || "",
                      ...(itemProviderOptions && {
                        providerOptions: itemProviderOptions,
                      }),
                    };
                  }
                  return item;
                },
              ),
              ...(providerOptions && { providerOptions }),
            } as ModelMessage;
          }
        });

        span.setAttribute(ATTR.MSG_COUNT, coreMessages.length);
        span.setAttribute(ATTR.MSG_HAS_IMAGES, hasImages);
        span.setAttribute(ATTR.MSG_HAS_FILES, hasFiles);
        span.setAttribute(ATTR.MSG_HAS_SYSTEM_PROMPT, !!options.systemPrompt);
        span.setAttribute(
          ATTR.MSG_TOTAL_CONTENT_LENGTH,
          computeTotalContentLength(coreMessages),
        );

        return coreMessages;
      },
    );
  }

  /**
   * Build messages array for streaming operations
   * This is a protected helper method that providers can use to build messages
   * with automatic multimodal detection, eliminating code duplication
   *
   * @param options - Stream options or text generation options
   * @returns Promise resolving to ModelMessage array ready for AI SDK
   */
  async buildMessagesForStream(
    options: StreamOptions | TextGenerationOptions,
  ): Promise<ModelMessage[]> {
    return withSpan(
      {
        name: "neurolink.message.build_for_stream",
        tracer: tracers.sdk,
        attributes: {
          [ATTR.NL_PROVIDER]: this.providerName,
          [ATTR.NL_MODEL]: this.modelName,
        },
      },
      async (span) => {
        const { isMultimodal, hasImages, hasFiles } = detectMultimodal(options);
        span.setAttribute(ATTR.MSG_IS_MULTIMODAL, isMultimodal);

        let messages: ModelMessage[] | MultimodalChatMessage[];
        if (isMultimodal) {
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
          // Propagate any systemPrompt augmentation (e.g. inline-file
          // handling guidance from processUnifiedFilesArray) back to the
          // caller's options. Providers like GoogleVertex's native
          // @google/genai stream path read `options.systemPrompt` directly
          // — without this propagation the augmentation lives only on the
          // local `multimodalOptions` clone and never reaches the model.
          if (
            multimodalOptions.systemPrompt &&
            multimodalOptions.systemPrompt !== options.systemPrompt
          ) {
            options.systemPrompt = multimodalOptions.systemPrompt;
          }
        } else {
          if (process.env.NEUROLINK_DEBUG === "true") {
            logger.debug(
              `${this.providerName}: No multimodal input detected, using standard message builder`,
            );
          }
          messages = await buildMessagesArray(options);
        }

        // Convert messages to Vercel AI SDK format
        // Preserve providerOptions (e.g. Anthropic cache_control) through conversion
        const coreMessages = messages.map((msg) => {
          const providerOptions = (msg as Record<string, unknown>)
            .providerOptions as Record<string, unknown> | undefined;
          if (typeof msg.content === "string") {
            return {
              role: msg.role as "user" | "assistant" | "system",
              content: msg.content,
              ...(providerOptions && { providerOptions }),
            } as ModelMessage;
          } else {
            return {
              role: msg.role as "user" | "assistant" | "system",
              content: (msg.content as Array<Record<string, unknown>>).map(
                (item) => {
                  const itemProviderOptions = item.providerOptions as
                    | Record<string, unknown>
                    | undefined;
                  if (item.type === "text") {
                    return {
                      type: "text" as const,
                      text: (item.text as string) || "",
                      ...(itemProviderOptions && {
                        providerOptions: itemProviderOptions,
                      }),
                    };
                  } else if (item.type === "image") {
                    return {
                      type: "image" as const,
                      image: (item.image as string) || "",
                      ...(itemProviderOptions && {
                        providerOptions: itemProviderOptions,
                      }),
                    };
                  }
                  return item;
                },
              ),
              ...(providerOptions && { providerOptions }),
            } as ModelMessage;
          }
        });

        span.setAttribute(ATTR.MSG_COUNT, coreMessages.length);
        span.setAttribute(ATTR.MSG_HAS_IMAGES, hasImages);
        span.setAttribute(ATTR.MSG_HAS_FILES, hasFiles);
        span.setAttribute(ATTR.MSG_HAS_SYSTEM_PROMPT, !!options.systemPrompt);
        span.setAttribute(
          ATTR.MSG_TOTAL_CONTENT_LENGTH,
          computeTotalContentLength(coreMessages),
        );

        return coreMessages;
      },
    );
  }
}
