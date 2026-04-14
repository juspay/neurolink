/**
 * Content Moderation Processor
 *
 * Checks input for inappropriate or policy-violating content
 * before sending to the LLM.
 *
 * @module contentModerationProcessor
 */

import type { JsonObject } from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import type {
  ContentModerationConfig,
  InputProcessor,
  InputProcessorData,
  ModerationCategory,
  ProcessorIssue,
  ProcessorResult,
} from "../../types/index.js";

/**
 * Default blocked word list (common inappropriate terms)
 * In production, this should be loaded from a configurable source
 *
 * Note: This list contains minimal defaults for demonstration purposes.
 * Production systems should configure their own comprehensive lists
 * based on their specific content policies and requirements.
 */
const DEFAULT_BLOCKED_WORDS: string[] = [
  // Placeholder - Add domain-specific blocked terms as needed
  // This empty default allows the processor to function without
  // blocking content by default, letting users configure their own lists
];

/**
 * Default moderation categories to check
 */
const DEFAULT_CATEGORIES: ModerationCategory[] = [
  "hate_speech",
  "violence",
  "harassment",
];

/**
 * Simple word-based content check
 */
function checkBlockedWords(
  text: string,
  blockedWords: string[],
): { found: boolean; words: string[] } {
  const lowerText = text.toLowerCase();
  const foundWords: string[] = [];

  for (const word of blockedWords) {
    if (lowerText.includes(word.toLowerCase())) {
      foundWords.push(word);
    }
  }

  return {
    found: foundWords.length > 0,
    words: foundWords,
  };
}

/**
 * Check text against blocked patterns
 */
function checkBlockedPatterns(
  text: string,
  patterns: string[],
): { found: boolean; patterns: string[] } {
  const matchedPatterns: string[] = [];

  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, "gi");
      if (regex.test(text)) {
        matchedPatterns.push(pattern);
      }
    } catch {
      // Invalid regex, skip
    }
  }

  return {
    found: matchedPatterns.length > 0,
    patterns: matchedPatterns,
  };
}

/**
 * Create a Content Moderation Processor
 *
 * @param defaultConfig - Default configuration
 * @returns InputProcessor instance
 *
 * @example
 * ```typescript
 * const moderationProcessor = createContentModerationProcessor({
 *   blockedWords: ["inappropriate", "offensive"],
 *   blockedPatterns: ["\\bspam\\b"],
 *   blockThreshold: 0.8,
 * });
 *
 * const result = await moderationProcessor.process(inputData);
 * ```
 */
export function createContentModerationProcessor(
  defaultConfig?: ContentModerationConfig,
): InputProcessor<ContentModerationConfig> {
  return {
    id: "content-moderation",
    name: "Content Moderation",
    description: "Checks input for inappropriate or policy-violating content",
    priority: 80,

    async process(
      data: InputProcessorData,
      config?: ContentModerationConfig,
    ): Promise<ProcessorResult<InputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        categories = DEFAULT_CATEGORIES,
        blockThreshold = 0.8,
        warnThreshold = 0.5,
        useAIModeration = false,
        blockedWords = DEFAULT_BLOCKED_WORDS,
        blockedPatterns = [],
      } = mergedConfig;

      // Combine all text to scan
      let textToScan = data.text || "";
      const messageTexts = data.messages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n");
      textToScan = `${textToScan}\n${messageTexts}`.trim();

      if (!textToScan) {
        return {
          action: "continue",
          data,
          metadata: { moderationPassed: true, contentScanned: false },
        };
      }

      const issues: ProcessorIssue[] = [];
      let shouldBlock = false;
      let overallScore = 0;

      // Check blocked words
      if (blockedWords.length > 0) {
        const wordCheck = checkBlockedWords(textToScan, blockedWords);
        if (wordCheck.found) {
          shouldBlock = true;
          issues.push({
            category: "content_moderation",
            severity: "critical",
            message: `Blocked words detected: ${wordCheck.words.length} match(es)`,
            context: {
              type: "blocked_words",
              count: wordCheck.words.length,
            } as JsonObject,
          });
        }
      }

      // Check blocked patterns
      if (blockedPatterns.length > 0) {
        const patternCheck = checkBlockedPatterns(textToScan, blockedPatterns);
        if (patternCheck.found) {
          shouldBlock = true;
          issues.push({
            category: "content_moderation",
            severity: "critical",
            message: `Blocked patterns matched: ${patternCheck.patterns.length} pattern(s)`,
            context: {
              type: "blocked_patterns",
              count: patternCheck.patterns.length,
            } as JsonObject,
          });
        }
      }

      // AI-based moderation if enabled and not already blocked
      if (useAIModeration && !shouldBlock) {
        // Use AI moderation with the merged configuration
        const moderationResult = await performSimpleModeration(
          textToScan,
          categories,
          mergedConfig,
        );
        overallScore = moderationResult.overallScore;

        if (moderationResult.overallScore >= blockThreshold) {
          shouldBlock = true;
          issues.push({
            category: "content_moderation",
            severity: "critical",
            message: `AI moderation flagged content (score: ${moderationResult.overallScore.toFixed(2)})`,
            context: {
              type: "ai_moderation",
              score: moderationResult.overallScore,
              flaggedCategories: moderationResult.flaggedCategories,
            } as JsonObject,
          });
        } else if (moderationResult.overallScore >= warnThreshold) {
          issues.push({
            category: "content_moderation",
            severity: "warning",
            message: `AI moderation warning (score: ${moderationResult.overallScore.toFixed(2)})`,
            context: {
              type: "ai_moderation",
              score: moderationResult.overallScore,
              flaggedCategories: moderationResult.flaggedCategories,
            } as JsonObject,
          });
        }
      }

      // Handle block case
      if (shouldBlock) {
        return {
          action: "abort",
          feedback:
            "Content violates moderation policies. Please revise your message.",
          issues,
          metadata: {
            moderationPassed: false,
            blockedWordMatch: blockedWords.length > 0,
            blockedPatternMatch: blockedPatterns.length > 0,
            aiModerationScore: overallScore,
          },
        };
      }

      // Continue with any warnings
      return {
        action: "continue",
        data,
        issues: issues.length > 0 ? issues : undefined,
        metadata: {
          moderationPassed: true,
          issueCount: issues.length,
          aiModerationScore: overallScore,
        },
      };
    },

    validateConfig(config: ContentModerationConfig): {
      valid: boolean;
      errors: string[];
    } {
      const errors: string[] = [];

      if (config.blockThreshold !== undefined) {
        if (config.blockThreshold < 0 || config.blockThreshold > 1) {
          errors.push("blockThreshold must be between 0 and 1");
        }
      }

      if (config.warnThreshold !== undefined) {
        if (config.warnThreshold < 0 || config.warnThreshold > 1) {
          errors.push("warnThreshold must be between 0 and 1");
        }
      }

      if (
        config.blockThreshold !== undefined &&
        config.warnThreshold !== undefined
      ) {
        if (config.warnThreshold > config.blockThreshold) {
          errors.push(
            "warnThreshold should not be greater than blockThreshold",
          );
        }
      }

      return { valid: errors.length === 0, errors };
    },
  };
}

/**
 * AI-based moderation result type
 */
type AIModerationResult = {
  overallScore: number;
  flaggedCategories: string[];
  categoryScores: Record<string, number>;
};

/**
 * Perform AI-powered moderation using NeuroLink's AI providers
 * This function integrates with the AI provider system for content analysis
 *
 * @param text - Text content to moderate
 * @param categories - Categories to check
 * @param config - Moderation configuration with provider/model settings
 * @returns Promise resolving to moderation result with scores
 */
async function performAIModeration(
  text: string,
  categories: ModerationCategory[],
  config: ContentModerationConfig,
): Promise<AIModerationResult> {
  // Build the moderation prompt
  const categoryList = categories.join(", ");
  const moderationPrompt = `Analyze the following text for content moderation. Check for these categories: ${categoryList}.

For each category, provide a score from 0.0 (not present) to 1.0 (strongly present).
Return a JSON object with:
- "scores": object mapping each category to its score (0.0-1.0)
- "flagged": array of category names with score > 0.5
- "overall": highest score across all categories

Text to analyze:
"""
${text.substring(0, 2000)}
"""

Respond with ONLY the JSON object, no explanation.`;

  try {
    // Dynamic import to avoid circular dependencies
    const { AIProviderFactory } = await import("../../core/factory.js");
    const _enumsModule = await import("../../constants/enums.js");
    type AIProviderNameType =
      (typeof _enumsModule.AIProviderName)[keyof typeof _enumsModule.AIProviderName];

    // Use configured provider or default to a capable model
    const providerName = (config.aiProvider || "openai") as AIProviderNameType;
    const modelName = config.aiModel || undefined;

    const provider = await AIProviderFactory.createProvider(
      providerName,
      modelName,
      false, // Disable tools for moderation
    );

    const result = await provider.generate({
      prompt: moderationPrompt,
      systemPrompt:
        "You are a content moderation system. Analyze text and return JSON scores for content policy categories. Be accurate and consistent.",
      temperature: 0.1, // Low temperature for consistent scoring
      maxTokens: 500,
    });

    // Parse the JSON response - handle null result case
    if (!result || !result.content) {
      return performHeuristicModeration(text, categories);
    }
    const content = result.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        scores?: Record<string, number>;
        flagged?: string[];
        overall?: number;
      };
      return {
        overallScore: parsed.overall ?? 0,
        flaggedCategories: parsed.flagged ?? [],
        categoryScores: parsed.scores ?? {},
      };
    }
  } catch (error) {
    // Log error but don't fail - fall back to heuristic moderation
    logger.warn(
      `[ContentModeration] AI moderation failed, falling back to heuristics: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Fallback to heuristic moderation if AI fails
  return performHeuristicModeration(text, categories);
}

/**
 * Simple heuristic-based moderation (fallback when AI moderation is unavailable)
 * In production, this serves as a backup when AI services are unavailable
 */
async function performHeuristicModeration(
  text: string,
  _categories: ModerationCategory[],
): Promise<AIModerationResult> {
  const lowerText = text.toLowerCase();
  let score = 0;
  const flaggedCategories: string[] = [];
  const categoryScores: Record<string, number> = {};

  // Simple heuristics (these serve as a fallback when AI moderation fails)
  const violenceIndicators = ["kill", "murder", "attack", "destroy", "hurt"];
  const harassmentIndicators = ["stupid", "idiot", "dumb", "hate you"];

  const violenceMatches = violenceIndicators.filter((w) =>
    lowerText.includes(w),
  );
  if (violenceMatches.length > 0) {
    const violenceScore = Math.min(0.3 * violenceMatches.length, 1.0);
    score = Math.max(score, violenceScore);
    categoryScores["violence"] = violenceScore;
    if (violenceScore > 0.5) {
      flaggedCategories.push("violence");
    }
  }

  const harassmentMatches = harassmentIndicators.filter((w) =>
    lowerText.includes(w),
  );
  if (harassmentMatches.length > 0) {
    const harassmentScore = Math.min(0.2 * harassmentMatches.length, 1.0);
    score = Math.max(score, harassmentScore);
    categoryScores["harassment"] = harassmentScore;
    if (harassmentScore > 0.5) {
      flaggedCategories.push("harassment");
    }
  }

  // Cap score at 1.0
  score = Math.min(score, 1.0);

  return {
    overallScore: score,
    flaggedCategories,
    categoryScores,
  };
}

/**
 * Simple heuristic-based moderation (placeholder for AI-based moderation)
 * In production, this should call an actual moderation API
 */
async function performSimpleModeration(
  text: string,
  categories: ModerationCategory[],
  config?: ContentModerationConfig,
): Promise<{
  overallScore: number;
  flaggedCategories: string[];
}> {
  // Use AI moderation if configured
  if (config?.useAIModeration) {
    return performAIModeration(text, categories, config);
  }

  // Otherwise use heuristic moderation
  return performHeuristicModeration(text, categories);
}

/**
 * Pre-configured content moderation processor with default settings
 */
export const contentModerationProcessor = createContentModerationProcessor();
