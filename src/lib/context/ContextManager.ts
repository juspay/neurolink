import type {
  AIProviderName,
  TextGenerationOptions,
  TextGenerationResult,
} from "../core/types.js";
import type { ContextManagerConfig, ChatMessage } from "./types.js";
import { logger } from "../utils/logger.js";
import { formatHistoryToString } from "./utils.js";

type InternalGenerator = (
  options: TextGenerationOptions,
) => Promise<TextGenerationResult>;

/**
 * Manages conversation context, automatically summarizing it when it
 * exceeds a specified word count limit.
 */
export class ContextManager {
  private static readonly SUMMARIZATION_FAILED_WARNING =
    "[System Warning: Context summarization failed. Conversation history has been truncated.]";
  private static readonly SUMMARIZATION_EMPTY_WARNING =
    "[System Warning: Context summarization failed to return valid content. Conversation history has been truncated.]";

  private history: ChatMessage[];
  private wordCount: number;
  private readonly internalGenerator: InternalGenerator;
  private readonly config: ContextManagerConfig;

  constructor(
    generatorFunction: InternalGenerator,
    config: ContextManagerConfig,
    initialContext: string = "This is the start of the conversation.",
  ) {
    this.internalGenerator = generatorFunction;
    this.config = config;
    const initialMessage: ChatMessage = {
      role: "system",
      content: initialContext,
    };
    initialMessage.wordCount = this.config.estimateWordCount([initialMessage]);
    this.history = [initialMessage];
    this.wordCount = initialMessage.wordCount;
  }

  public async addTurn(
    role: "user" | "assistant",
    message: string,
  ): Promise<void> {
    const newMessage: ChatMessage = { role, content: message };
    newMessage.wordCount = this.config.estimateWordCount([newMessage]);
    this.history.push(newMessage);
    this.wordCount += newMessage.wordCount;

    logger.info(
      `[ContextManager] Current word count: ${this.wordCount} / ${this.config.highWaterMarkWords}`,
    );
    if (this.wordCount > this.config.highWaterMarkWords) {
      await this._summarize();
    }
  }

  /**
   * Formats the history including the latest user turn for the prompt, without modifying the permanent history.
   */
  public getContextForPrompt(role: "user", message: string): string {
    const tempHistory = [...this.history, { role, content: message }];
    return formatHistoryToString(tempHistory);
  }

  public getCurrentContext(): string {
    // Format the history into a single string for the provider prompt
    return formatHistoryToString(this.history);
  }

  private async _summarize(): Promise<void> {
    try {
      const prompt = this.config.getSummarizationPrompt(
        this.history,
        this.config.lowWaterMarkWords,
      );

      // Construct options for the internal method, bypassing the main 'generate' entry point
      const textOptions: TextGenerationOptions = {
        prompt,
        provider: this.config.summarizationProvider as AIProviderName,
        model: this.config.summarizationModel,
        // Ensure summarization does not trigger more context management or tools
        disableTools: true,
      };

      // Call the internal generation function directly to avoid recursion
      const result = await this.internalGenerator(textOptions);
      if (typeof result.content === "string" && result.content.length > 0) {
        // Replace the history with a single system message containing the summary
        const newHistory: ChatMessage[] = [
          { role: "system", content: result.content },
        ];
        this.history = newHistory;
        this.wordCount = this.config.estimateWordCount(this.history);
        logger.info(
          `[ContextManager] Summarization complete. New history length: ${this.wordCount} words.`,
        );
      } else {
        logger.warn(
          "[ContextManager] Summarization returned empty or non-string content; truncating history as a fallback.",
        );
        this._truncateHistory(this.config.lowWaterMarkWords);
        this.history.unshift({
          role: "system",
          content: ContextManager.SUMMARIZATION_EMPTY_WARNING,
        });
        this.wordCount = this.config.estimateWordCount(this.history);
      }
      logger.debug(
        `[ContextManager] New history: ${JSON.stringify(this.history)}`,
      );
    } catch (error) {
      logger.error("Context summarization failed:", { error });
      // Fallback strategy: truncate the history to the target word count.
      this._truncateHistory(this.config.lowWaterMarkWords);
      this.history.unshift({
        role: "system",
        content: ContextManager.SUMMARIZATION_FAILED_WARNING,
      });
      this.wordCount = this.config.estimateWordCount(this.history);
    }
  }

  /**
   * Truncates the history to a specific word count, preserving the most recent messages.
   */
  private _truncateHistory(wordLimit: number): void {
    if (this.wordCount <= wordLimit) {
      return;
    }

    let runningCount = 0;
    let sliceIndex = this.history.length;
    for (let i = this.history.length - 1; i >= 0; i--) {
      let wordCount = this.history[i].wordCount;
      if (wordCount === undefined) {
        logger.warn(
          `[ContextManager] Word count cache missing for message at index ${i}. Recalculating.`,
        );
        wordCount = this.config.estimateWordCount([this.history[i]]);
      }
      runningCount += wordCount;
      if (runningCount > wordLimit) {
        sliceIndex = i + 1;
        break;
      }
    }
    this.history = this.history.slice(sliceIndex);
  }
}
