/**
 * Task Classification Types
 * Type definitions for the task classification system
 */

/**
 * Supported task types for classification
 */
export type TaskType = "fast" | "reasoning";

/**
 * Result of task classification analysis
 */
export type TaskClassification = {
  /** The classified task type */
  type: TaskType;
  /** Confidence score (0-1) in the classification */
  confidence: number;
  /** Human-readable explanation of the classification decision */
  reasoning: string;
};

/**
 * Internal scoring data used during classification analysis
 */
export type ClassificationScores = {
  /** Score indicating likelihood of fast task */
  fastScore: number;
  /** Score indicating likelihood of reasoning task */
  reasoningScore: number;
  /** Array of reasons contributing to the scores */
  reasons: string[];
};

/**
 * Statistics for batch classification analysis
 */
export type ClassificationStats = {
  /** Total number of prompts analyzed */
  total: number;
  /** Number of prompts classified as fast */
  fast: number;
  /** Number of prompts classified as reasoning */
  reasoning: number;
  /** Average confidence across all classifications */
  averageConfidence: number;
};

/**
 * Validation result for testing classification accuracy
 */
export type ClassificationValidation = {
  /** Whether the classification matched the expected result */
  correct: boolean;
  /** The actual classification result */
  classification: TaskClassification;
};
