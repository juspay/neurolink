import type { StreamOptions } from "../types/streamTypes.js";

/**
 * Builds a normalized multimodal options payload for streaming providers.
 *
 * This utility extracts and normalizes multimodal input fields from StreamOptions
 * into a consistent format that can be consumed by buildMultimodalMessagesArray.
 *
 * @param {StreamOptions} options - Stream options containing:
 *   - input.text: Main text prompt
 *   - input.images: Image files (Buffer | string paths/URLs)
 *   - input.content: Advanced multimodal content array
 *   - input.files: Auto-detected file types
 *   - input.csvFiles: CSV files for tabular data
 *   - input.pdfFiles: PDF documents (Buffer | string paths)
 *   - csvOptions: CSV parsing options
 *   - systemPrompt: System-level instructions
 *   - conversationMessages: Chat history
 *   - temperature: Model temperature (0-1)
 *   - maxTokens: Maximum output tokens
 *   - enableAnalytics: Enable analytics tracking
 *   - enableEvaluation: Enable response evaluation
 *   - context: Additional context data
 * @param {string} providerName - Provider identifier (e.g., "vertex", "openai", "anthropic")
 * @param {string} modelName - Model identifier (e.g., "gemini-2.5-flash", "gpt-4o")
 * @returns {object} Normalized options object with:
 *   - input: { text, images, content, files, csvFiles, pdfFiles }
 *   - csvOptions: CSV processing options
 *   - systemPrompt: System prompt string
 *   - conversationHistory: Message history array
 *   - provider: Provider name
 *   - model: Model name
 *   - temperature: Temperature value
 *   - maxTokens: Token limit
 *   - enableAnalytics: Analytics flag
 *   - enableEvaluation: Evaluation flag
 *   - context: Context data
 *
 * @example
 * ```typescript
 * const opts = buildMultimodalOptions(streamOptions, "vertex", "gemini-2.5-flash");
 * const messages = await buildMultimodalMessagesArray(opts, "vertex", "gemini-2.5-flash");
 * ```
 */
export function buildMultimodalOptions(
  options: StreamOptions,
  providerName: string,
  modelName: string,
) {
  return {
    input: {
      text: options.input?.text || "",
      images: options.input?.images,
      content: options.input?.content,
      files: options.input?.files,
      csvFiles: options.input?.csvFiles,
      pdfFiles: options.input?.pdfFiles,
    },
    csvOptions: options.csvOptions,
    systemPrompt: options.systemPrompt,
    conversationHistory: options.conversationMessages,
    provider: providerName,
    model: modelName,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    enableAnalytics: options.enableAnalytics,
    enableEvaluation: options.enableEvaluation,
    context: options.context,
    fileRegistry: (options as Record<string, unknown>).fileRegistry,
  };
}
