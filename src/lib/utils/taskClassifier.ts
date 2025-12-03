/**
 * Binary Task Classifier for NeuroLink Orchestration
 * Classifies tasks as either 'fast' (quick responses) or 'reasoning' (complex analysis)
 */

import { logger } from "./logger.js";
import { CLASSIFICATION_THRESHOLDS } from "../config/taskClassificationConfig.js";
import {
  analyzePrompt,
  calculateConfidence,
  determineTaskType,
} from "./taskClassificationUtils.js";
import { redactForClassification } from "./promptRedaction.js";
import type {
  TaskType,
  TaskClassification,
  ClassificationScores,
  ClassificationStats,
  ClassificationValidation,
} from "../types/taskClassificationTypes.js";

/**
 * Binary Task Classifier
 * Determines if a task requires fast response or deeper reasoning
 */
export class BinaryTaskClassifier {
  /**
   * Classify a prompt as either fast or reasoning task
   */
  static classify(prompt: string): TaskClassification {
    const startTime = Date.now();

    // Analyze the prompt using utility functions
    const scores: ClassificationScores = analyzePrompt(prompt);
    const { fastScore, reasoningScore, reasons } = scores;

    // Determine final classification
    const totalScore = fastScore + reasoningScore;
    let type: TaskType;
    let confidence: number;

    if (totalScore === 0) {
      // Default to fast for ambiguous cases
      type = "fast";
      confidence = CLASSIFICATION_THRESHOLDS.DEFAULT_CONFIDENCE;
      reasons.push("default fallback");
    } else {
      type = determineTaskType(fastScore, reasoningScore);
      confidence = calculateConfidence(fastScore, reasoningScore);
    }

    const classification: TaskClassification = {
      type,
      confidence,
      reasoning: reasons.join(", "),
    };

    const classificationTime = Date.now() - startTime;

    logger.debug("Task classified", {
      prompt: redactForClassification(prompt),
      classification: type,
      confidence: confidence.toFixed(2),
      fastScore,
      reasoningScore,
      reasons: reasons.join(", "),
      classificationTime: `${classificationTime}ms`,
    });

    return classification;
  }

  /**
   * Get classification statistics for multiple prompts
   */
  static getClassificationStats(prompts: string[]): ClassificationStats {
    // Guard against empty array to prevent divide-by-zero
    if (prompts.length === 0) {
      const stats = {
        total: 0,
        fast: 0,
        reasoning: 0,
        averageConfidence: 0,
      };
      logger.debug("Classification stats", stats);
      return stats;
    }

    const classifications = prompts.map((prompt) => this.classify(prompt));

    const stats = {
      total: classifications.length,
      fast: classifications.filter((c) => c.type === "fast").length,
      reasoning: classifications.filter((c) => c.type === "reasoning").length,
      averageConfidence:
        classifications.reduce((sum, c) => sum + c.confidence, 0) /
        classifications.length,
    };

    logger.debug("Classification stats", stats);
    return stats;
  }

  /**
   * Validate classification accuracy (for testing/tuning)
   */
  static validateClassification(
    prompt: string,
    expectedType: TaskType,
  ): ClassificationValidation {
    const classification = this.classify(prompt);
    const correct = classification.type === expectedType;

    logger.debug("Classification validation", {
      prompt: redactForClassification(prompt),
      expected: expectedType,
      actual: classification.type,
      correct,
      confidence: classification.confidence,
    });

    return { correct, classification };
  }
}
