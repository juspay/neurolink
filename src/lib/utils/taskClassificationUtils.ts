/**
 * Task Classification Utility Functions
 * Helper functions for analyzing prompts and calculating scores
 */

import {
  FAST_PATTERNS,
  REASONING_PATTERNS,
  FAST_KEYWORDS,
  REASONING_KEYWORDS,
  SCORING_WEIGHTS,
  CLASSIFICATION_THRESHOLDS,
  DOMAIN_PATTERNS,
} from "../config/taskClassificationConfig.js";
import type { ClassificationScores } from "../types/taskClassificationTypes.js";

/**
 * Analyze prompt length and apply scoring bonuses
 */
export function analyzeLengthFactors(
  prompt: string,
  reasons: string[],
): { fastScore: number; reasoningScore: number } {
  let fastScore = 0;
  let reasoningScore = 0;

  if (prompt.length < CLASSIFICATION_THRESHOLDS.SHORT_PROMPT_LENGTH) {
    fastScore += SCORING_WEIGHTS.SHORT_PROMPT_BONUS;
    reasons.push("short prompt");
  } else if (prompt.length > CLASSIFICATION_THRESHOLDS.LONG_PROMPT_LENGTH) {
    reasoningScore += SCORING_WEIGHTS.LONG_PROMPT_BONUS;
    reasons.push("detailed prompt");
  }

  return { fastScore, reasoningScore };
}

/**
 * Check prompt against fast task patterns
 */
export function checkFastPatterns(
  normalizedPrompt: string,
  reasons: string[],
): number {
  for (const pattern of FAST_PATTERNS) {
    if (pattern.test(normalizedPrompt)) {
      reasons.push("fast pattern match");
      return SCORING_WEIGHTS.PATTERN_MATCH_SCORE;
    }
  }
  return 0;
}

/**
 * Check prompt against reasoning task patterns
 */
export function checkReasoningPatterns(
  normalizedPrompt: string,
  reasons: string[],
): number {
  for (const pattern of REASONING_PATTERNS) {
    if (pattern.test(normalizedPrompt)) {
      reasons.push("reasoning pattern match");
      return SCORING_WEIGHTS.PATTERN_MATCH_SCORE;
    }
  }
  return 0;
}

/**
 * Analyze keyword matches in the prompt
 */
export function analyzeKeywords(
  normalizedPrompt: string,
  reasons: string[],
): { fastScore: number; reasoningScore: number } {
  const fastKeywordMatches = FAST_KEYWORDS.filter((keyword) =>
    normalizedPrompt.includes(keyword),
  ).length;

  const reasoningKeywordMatches = REASONING_KEYWORDS.filter((keyword) =>
    normalizedPrompt.includes(keyword),
  ).length;

  const fastScore = fastKeywordMatches * SCORING_WEIGHTS.KEYWORD_MATCH_SCORE;
  const reasoningScore =
    reasoningKeywordMatches * SCORING_WEIGHTS.KEYWORD_MATCH_SCORE;

  if (fastKeywordMatches > 0) {
    reasons.push(`${fastKeywordMatches} fast keywords`);
  }
  if (reasoningKeywordMatches > 0) {
    reasons.push(`${reasoningKeywordMatches} reasoning keywords`);
  }

  return { fastScore, reasoningScore };
}

/**
 * Analyze question complexity
 */
export function analyzeQuestionComplexity(
  prompt: string,
  reasons: string[],
): number {
  const questionMarks = (prompt.match(/\?/g) || []).length;
  if (questionMarks > 1) {
    reasons.push("multiple questions");
    return SCORING_WEIGHTS.MULTIPLE_QUESTIONS_BONUS;
  }
  return 0;
}

/**
 * Analyze prompt structure and punctuation
 */
export function analyzePromptStructure(
  prompt: string,
  reasons: string[],
): number {
  const sentences = prompt.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 3) {
    reasons.push("multi-sentence structure");
    return SCORING_WEIGHTS.MULTI_SENTENCE_BONUS;
  }
  return 0;
}

/**
 * Analyze domain-specific indicators
 */
export function analyzeDomainIndicators(
  normalizedPrompt: string,
  prompt: string,
  reasons: string[],
): { fastScore: number; reasoningScore: number } {
  let fastScore = 0;
  let reasoningScore = 0;

  // Check for technical domain
  if (DOMAIN_PATTERNS.TECHNICAL.test(normalizedPrompt)) {
    reasoningScore += SCORING_WEIGHTS.TECHNICAL_DOMAIN_BONUS;
    reasons.push("technical domain");
  }

  // Check for simple definition requests
  if (
    DOMAIN_PATTERNS.SIMPLE_DEFINITION.test(normalizedPrompt) &&
    prompt.length < CLASSIFICATION_THRESHOLDS.SIMPLE_DEFINITION_LENGTH
  ) {
    fastScore += SCORING_WEIGHTS.SIMPLE_DEFINITION_BONUS;
    reasons.push("simple definition request");
  }

  return { fastScore, reasoningScore };
}

/**
 * Calculate final confidence score
 */
export function calculateConfidence(
  fastScore: number,
  reasoningScore: number,
): number {
  const totalScore = fastScore + reasoningScore;

  if (totalScore === 0) {
    return CLASSIFICATION_THRESHOLDS.DEFAULT_CONFIDENCE;
  }

  const rawConfidence = Math.max(fastScore, reasoningScore) / totalScore;
  return Math.max(
    CLASSIFICATION_THRESHOLDS.MIN_CONFIDENCE,
    Math.min(CLASSIFICATION_THRESHOLDS.MAX_CONFIDENCE, rawConfidence),
  );
}

/**
 * Determine task type based on scores
 */
export function determineTaskType(
  fastScore: number,
  reasoningScore: number,
): "fast" | "reasoning" {
  return fastScore >= reasoningScore ? "fast" : "reasoning";
}

/**
 * Comprehensive prompt analysis
 * Runs all analysis functions and returns combined scores
 */
export function analyzePrompt(prompt: string): ClassificationScores {
  const normalizedPrompt = prompt.toLowerCase().trim();
  const reasons: string[] = [];
  let fastScore = 0;
  let reasoningScore = 0;

  // 1. Length analysis
  const lengthScores = analyzeLengthFactors(prompt, reasons);
  fastScore += lengthScores.fastScore;
  reasoningScore += lengthScores.reasoningScore;

  // 2. Pattern matching
  fastScore += checkFastPatterns(normalizedPrompt, reasons);
  reasoningScore += checkReasoningPatterns(normalizedPrompt, reasons);

  // 3. Keyword analysis
  const keywordScores = analyzeKeywords(normalizedPrompt, reasons);
  fastScore += keywordScores.fastScore;
  reasoningScore += keywordScores.reasoningScore;

  // 4. Question complexity
  reasoningScore += analyzeQuestionComplexity(prompt, reasons);

  // 5. Structure analysis
  reasoningScore += analyzePromptStructure(prompt, reasons);

  // 6. Domain analysis
  const domainScores = analyzeDomainIndicators(
    normalizedPrompt,
    prompt,
    reasons,
  );
  fastScore += domainScores.fastScore;
  reasoningScore += domainScores.reasoningScore;

  return { fastScore, reasoningScore, reasons };
}
