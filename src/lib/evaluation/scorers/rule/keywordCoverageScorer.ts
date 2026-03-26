/**
 * @file Keyword Coverage Scorer
 * Evaluates how well the response covers expected keywords or topics
 */

import type {
  RuleScorerConfig,
  ScoreResult,
  ScorerInput,
  ScorerMetadata,
  ScorerRule,
} from "../../../types/scorerTypes.js";
import { BaseRuleScorer } from "./baseRuleScorer.js";

/**
 * Configuration specific to keyword coverage scoring
 */
export type KeywordCoverageConfig = RuleScorerConfig & {
  /** Keywords to check for */
  keywords?: string[];
  /** Minimum coverage ratio (0-1) to pass */
  minCoverage?: number;
  /** Whether to use case-insensitive matching */
  caseInsensitive?: boolean;
  /** Whether to use word boundary matching */
  wordBoundary?: boolean;
  /** Synonyms map for flexible matching */
  synonyms?: Record<string, string[]>;
  /** Weight different keywords differently */
  keywordWeights?: Record<string, number>;
};

/**
 * Keyword coverage result details
 */
type KeywordCoverageDetails = {
  totalKeywords: number;
  foundKeywords: string[];
  missingKeywords: string[];
  coverageRatio: number;
  weightedCoverage: number;
};

/**
 * Scorer metadata for keyword coverage
 */
const KEYWORD_COVERAGE_METADATA: ScorerMetadata = {
  id: "keyword-coverage",
  name: "Keyword Coverage",
  description:
    "Evaluates how well the response covers expected keywords or topics",
  type: "rule",
  category: "quality",
  version: "1.0.0",
  defaultConfig: {
    enabled: true,
    threshold: 0.7,
    weight: 1.0,
    timeout: 1000,
    retries: 0,
  },
  requiredInputs: ["response"],
  optionalInputs: ["query", "context", "groundTruth", "custom"],
};

/**
 * KeywordCoverageScorer evaluates how well a response covers expected keywords
 */
export class KeywordCoverageScorer extends BaseRuleScorer {
  private _keywordConfig: KeywordCoverageConfig;
  private _dynamicRules: ScorerRule[] = [];

  constructor(config?: KeywordCoverageConfig) {
    super(KEYWORD_COVERAGE_METADATA, config);
    this._keywordConfig = {
      minCoverage: 0.7,
      caseInsensitive: true,
      wordBoundary: true,
      keywords: [],
      ...config,
    };

    // Build rules from keywords
    this._buildRulesFromKeywords();
  }

  /**
   * Build scorer rules from keyword configuration
   */
  private _buildRulesFromKeywords(): void {
    this._dynamicRules = this._buildRulesFromKeywordsList(
      this._keywordConfig.keywords ?? [],
    );
  }

  /**
   * Build scorer rules from a keyword list without mutating instance state.
   * Returns rules directly so callers can use them locally.
   */
  private _buildRulesFromKeywordsList(keywords: string[]): ScorerRule[] {
    const weights = this._keywordConfig.keywordWeights ?? {};

    return keywords.map((keyword, index) => ({
      id: `keyword-${index}-${keyword.toLowerCase().replace(/\s+/g, "-")}`,
      description: `Check for keyword: ${keyword}`,
      type: "keyword" as const,
      params: {
        keyword,
        caseInsensitive: this._keywordConfig.caseInsensitive ?? true,
        wordBoundary: this._keywordConfig.wordBoundary ?? true,
        synonyms: this._keywordConfig.synonyms?.[keyword] ?? [],
      },
      weight: weights[keyword] ?? 1.0,
    }));
  }

  /**
   * Get keyword-specific configuration
   */
  get keywordConfig(): KeywordCoverageConfig {
    return this._keywordConfig;
  }

  /**
   * Get rules for this scorer
   */
  getRules(): ScorerRule[] {
    return this._dynamicRules;
  }

  /**
   * Set keywords dynamically
   */
  setKeywords(keywords: string[], weights?: Record<string, number>): void {
    this._keywordConfig.keywords = keywords;
    if (weights) {
      this._keywordConfig.keywordWeights = weights;
    }
    this._buildRulesFromKeywords();
  }

  /**
   * Extract keywords from context or ground truth if not provided
   */
  private _extractKeywordsFromInput(input: ScorerInput): string[] {
    // If keywords are configured, use those
    if (
      this._keywordConfig.keywords &&
      this._keywordConfig.keywords.length > 0
    ) {
      return this._keywordConfig.keywords;
    }

    // Try to extract from custom input
    if (input.custom?.keywords && Array.isArray(input.custom.keywords)) {
      return input.custom.keywords as string[];
    }

    // Extract important words from ground truth if available
    if (input.groundTruth) {
      return this._extractImportantWords(input.groundTruth);
    }

    // Extract from context
    if (input.context && input.context.length > 0) {
      const contextText = input.context.join(" ");
      return this._extractImportantWords(contextText);
    }

    return [];
  }

  /**
   * Extract important words from text (simple extraction)
   */
  private _extractImportantWords(text: string): string[] {
    // Remove common stop words and extract longer words
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "shall",
      "can",
      "need",
      "dare",
      "ought",
      "used",
      "to",
      "of",
      "in",
      "for",
      "on",
      "with",
      "at",
      "by",
      "from",
      "as",
      "into",
      "through",
      "during",
      "before",
      "after",
      "above",
      "below",
      "between",
      "under",
      "again",
      "further",
      "then",
      "once",
      "and",
      "but",
      "or",
      "nor",
      "so",
      "yet",
      "both",
      "either",
      "neither",
      "not",
      "only",
      "own",
      "same",
      "than",
      "too",
      "very",
      "just",
      "also",
      "now",
      "here",
      "there",
      "when",
      "where",
      "why",
      "how",
      "all",
      "each",
      "every",
      "any",
      "some",
      "no",
      "other",
      "such",
      "this",
      "that",
      "these",
      "those",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "what",
      "which",
      "who",
      "whom",
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    // Get unique words, sorted by frequency
    const wordCounts = new Map<string, number>();
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }

    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Top 10 keywords
      .map(([word]) => word);
  }

  /**
   * Evaluate a single keyword rule
   */
  evaluateRule(
    rule: ScorerRule,
    input: ScorerInput,
  ): { passed: boolean; score: number } {
    const keyword = rule.params.keyword as string;
    const synonyms = (rule.params.synonyms as string[]) ?? [];
    const caseInsensitive = rule.params.caseInsensitive as boolean;
    const wordBoundary = rule.params.wordBoundary as boolean;

    const response = input.response;

    // Check main keyword
    const found = this._checkKeywordPresence(
      response,
      keyword,
      caseInsensitive,
      wordBoundary,
    );

    if (found) {
      return { passed: true, score: 1.0 };
    }

    // Check synonyms
    for (const synonym of synonyms) {
      if (
        this._checkKeywordPresence(
          response,
          synonym,
          caseInsensitive,
          wordBoundary,
        )
      ) {
        return { passed: true, score: 0.9 }; // Slightly lower for synonym match
      }
    }

    return { passed: false, score: 0.0 };
  }

  /**
   * Check if a keyword is present in text
   */
  private _checkKeywordPresence(
    text: string,
    keyword: string,
    caseInsensitive: boolean,
    wordBoundary: boolean,
  ): boolean {
    if (wordBoundary) {
      return this.containsKeyword(text, keyword, caseInsensitive);
    }

    if (caseInsensitive) {
      return text.toLowerCase().includes(keyword.toLowerCase());
    }

    return text.includes(keyword);
  }

  /**
   * Override score to handle dynamic keyword extraction
   */
  async score(input: ScorerInput): Promise<ScoreResult> {
    // Extract keywords if not configured
    const keywords = this._extractKeywordsFromInput(input);

    // Build rules locally without mutating instance state
    const effectiveRules =
      this._dynamicRules.length > 0
        ? this._dynamicRules
        : this._buildRulesFromKeywordsList(keywords);

    // If still no keywords, return a passing score with note
    if (effectiveRules.length === 0) {
      return this.createScoreResult(
        10,
        "No keywords configured or extractable - passing by default",
        {
          metadata: {
            noKeywordsConfigured: true,
          },
        },
      );
    }

    // Call parent score method
    const result = await super.score(input);

    // Add coverage details to metadata
    const details = this._calculateCoverageDetails(input);

    return {
      ...result,
      metadata: {
        ...result.metadata,
        coverageDetails: details,
      },
    };
  }

  /**
   * Calculate detailed coverage information
   */
  private _calculateCoverageDetails(
    input: ScorerInput,
  ): KeywordCoverageDetails {
    const keywords = this._keywordConfig.keywords ?? [];
    const weights = this._keywordConfig.keywordWeights ?? {};
    const response = input.response;

    const foundKeywords: string[] = [];
    const missingKeywords: string[] = [];
    let totalWeight = 0;
    let foundWeight = 0;

    for (const keyword of keywords) {
      const weight = weights[keyword] ?? 1.0;
      totalWeight += weight;

      const found = this._checkKeywordPresence(
        response,
        keyword,
        this._keywordConfig.caseInsensitive ?? true,
        this._keywordConfig.wordBoundary ?? true,
      );

      if (found) {
        foundKeywords.push(keyword);
        foundWeight += weight;
      } else {
        // Check synonyms
        const synonyms = this._keywordConfig.synonyms?.[keyword] ?? [];
        const synonymFound = synonyms.some((syn) =>
          this._checkKeywordPresence(
            response,
            syn,
            this._keywordConfig.caseInsensitive ?? true,
            this._keywordConfig.wordBoundary ?? true,
          ),
        );

        if (synonymFound) {
          foundKeywords.push(keyword);
          foundWeight += weight * 0.9; // Slightly less for synonym
        } else {
          missingKeywords.push(keyword);
        }
      }
    }

    return {
      totalKeywords: keywords.length,
      foundKeywords,
      missingKeywords,
      coverageRatio:
        keywords.length > 0 ? foundKeywords.length / keywords.length : 1,
      weightedCoverage: totalWeight > 0 ? foundWeight / totalWeight : 1,
    };
  }
}

/**
 * Factory function for creating KeywordCoverageScorer instances
 */
export async function createKeywordCoverageScorer(
  config?: KeywordCoverageConfig,
): Promise<KeywordCoverageScorer> {
  return new KeywordCoverageScorer(config);
}
