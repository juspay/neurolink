export interface ChatMessage {
  /** Role of the message sender */
  role: "user" | "assistant" | "system";

  /** Content of the message */
  content: string;

  /** Cached word count for performance */
  wordCount?: number;
}

/**
 * Defines the configuration for the ContextManager.
 * This allows for easy customization of the summarization behavior.
 */
export interface ContextManagerConfig {
  highWaterMarkWords: number;
  lowWaterMarkWords: number;
  summarizationModel: string;
  summarizationProvider: string;
  // A function that returns the summarization prompt.
  getSummarizationPrompt: (history: ChatMessage[], wordLimit: number) => string;
  // The word count estimation function.
  estimateWordCount: (history: ChatMessage[]) => number;
}
