/**
 * @file Content Similarity Scorer
 * Evaluates text similarity using various metrics (Jaccard, cosine, Levenshtein)
 */

import type {
  ContentSimilarityConfig,
  ScoreResult,
  ScorerInput,
  ScorerMetadata,
  SimilarityDetails,
  SimilarityMetric,
} from "../../../types/index.js";
import { BaseScorer } from "../baseScorer.js";
import { DEFAULT_RULE_SCORER_CONFIG } from "./baseRuleScorer.js";

/**
 * Scorer metadata for content similarity
 */
const CONTENT_SIMILARITY_METADATA: ScorerMetadata = {
  id: "content-similarity",
  name: "Content Similarity",
  description:
    "Evaluates text similarity using various metrics like Jaccard, cosine, Levenshtein",
  type: "rule",
  category: "accuracy",
  version: "1.0.0",
  defaultConfig: {
    ...DEFAULT_RULE_SCORER_CONFIG,
    threshold: 0.5,
  },
  requiredInputs: ["response"],
  optionalInputs: ["groundTruth", "context", "custom"],
};

/**
 * ContentSimilarityScorer evaluates how similar the response is to a reference text
 */
export class ContentSimilarityScorer extends BaseScorer {
  private _similarityConfig: ContentSimilarityConfig;

  constructor(config?: ContentSimilarityConfig) {
    super(CONTENT_SIMILARITY_METADATA, config);
    this._similarityConfig = {
      metric: "jaccard",
      normalizeText: true,
      tokenLevel: "word",
      ngramSize: 2,
      compareWith: "groundTruth",
      metricCombination: "average",
      ...config,
    };
  }

  /**
   * Get similarity-specific configuration
   */
  get similarityConfig(): ContentSimilarityConfig {
    return this._similarityConfig;
  }

  /**
   * Get reference text based on configuration
   */
  private _getReferenceText(input: ScorerInput): string | null {
    switch (this._similarityConfig.compareWith) {
      case "groundTruth":
        return input.groundTruth ?? null;

      case "context":
        if (input.context && input.context.length > 0) {
          return input.context.join(" ");
        }
        return null;

      case "custom":
        return (
          this._similarityConfig.referenceText ??
          (input.custom?.referenceText as string) ??
          null
        );

      default:
        return input.groundTruth ?? null;
    }
  }

  /**
   * Calculate similarity between two texts
   */
  private _calculateSimilarity(
    text1: string,
    text2: string,
    metric: SimilarityMetric,
  ): number {
    const normalizedText1 = this._similarityConfig.normalizeText
      ? this._normalizeText(text1)
      : text1;
    const normalizedText2 = this._similarityConfig.normalizeText
      ? this._normalizeText(text2)
      : text2;

    const tokens1 = this._tokenize(normalizedText1);
    const tokens2 = this._tokenize(normalizedText2);

    switch (metric) {
      case "jaccard":
        return this._jaccardSimilarity(tokens1, tokens2);

      case "cosine":
        return this._cosineSimilarity(tokens1, tokens2);

      case "levenshtein":
        return this._levenshteinSimilarity(normalizedText1, normalizedText2);

      case "dice":
        return this._diceSimilarity(tokens1, tokens2);

      case "overlap":
        return this._overlapCoefficient(tokens1, tokens2);

      default:
        return this._jaccardSimilarity(tokens1, tokens2);
    }
  }

  /**
   * Normalize text for comparison
   */
  private _normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Tokenize text based on configuration
   */
  private _tokenize(text: string): string[] {
    switch (this._similarityConfig.tokenLevel) {
      case "character":
        return text.split("");

      case "ngram": {
        const n = this._similarityConfig.ngramSize ?? 2;
        const ngrams: string[] = [];
        for (let i = 0; i <= text.length - n; i++) {
          ngrams.push(text.slice(i, i + n));
        }
        return ngrams;
      }

      case "word":
      default:
        return text.split(/\s+/).filter((word) => word.length > 0);
    }
  }

  /**
   * Calculate Jaccard similarity coefficient
   * J(A,B) = |A ∩ B| / |A ∪ B|
   */
  private _jaccardSimilarity(tokens1: string[], tokens2: string[]): number {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    const intersection = Array.from(set1).filter((x) => set2.has(x));
    const unionArr = [...Array.from(set1), ...Array.from(set2)];
    const union = new Set(unionArr);

    if (union.size === 0) {
      return 1.0;
    }
    return intersection.length / union.size;
  }

  /**
   * Calculate cosine similarity using term frequency vectors
   */
  private _cosineSimilarity(tokens1: string[], tokens2: string[]): number {
    const freq1 = this._getTermFrequency(tokens1);
    const freq2 = this._getTermFrequency(tokens2);

    const allTermsArr = [
      ...Array.from(freq1.keys()),
      ...Array.from(freq2.keys()),
    ];
    const allTerms = new Set(allTermsArr);

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const term of Array.from(allTerms)) {
      const f1 = freq1.get(term) ?? 0;
      const f2 = freq2.get(term) ?? 0;

      dotProduct += f1 * f2;
      magnitude1 += f1 * f1;
      magnitude2 += f2 * f2;
    }

    const magnitude = Math.sqrt(magnitude1) * Math.sqrt(magnitude2);
    if (magnitude === 0) {
      return 1.0;
    }

    return dotProduct / magnitude;
  }

  /**
   * Get term frequency map
   */
  private _getTermFrequency(tokens: string[]): Map<string, number> {
    const freq = new Map<string, number>();
    for (const token of tokens) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
    return freq;
  }

  /**
   * Calculate normalized Levenshtein similarity
   * Returns 1 - (edit_distance / max_length)
   */
  private _levenshteinSimilarity(text1: string, text2: string): number {
    // Guard against excessive memory usage for large texts
    const MAX_LEVENSHTEIN_LENGTH = 5000;
    if (
      text1.length > MAX_LEVENSHTEIN_LENGTH ||
      text2.length > MAX_LEVENSHTEIN_LENGTH
    ) {
      // Fall back to a faster approximation for large texts
      return this._jaccardSimilarity(text1.split(""), text2.split(""));
    }

    const distance = this._levenshteinDistance(text1, text2);
    const maxLength = Math.max(text1.length, text2.length);

    if (maxLength === 0) {
      return 1.0;
    }
    return 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein edit distance using space-optimized two-row DP
   */
  private _levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Use shorter string for row storage
    if (m < n) {
      return this._levenshteinDistance(str2, str1);
    }

    // Space-optimized: only keep previous and current row
    let prevRow = new Array<number>(n + 1);
    let currRow = new Array<number>(n + 1);

    // Initialize base case
    for (let j = 0; j <= n; j++) {
      prevRow[j] = j;
    }

    // Fill rows
    for (let i = 1; i <= m; i++) {
      currRow[0] = i;
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          currRow[j] = prevRow[j - 1];
        } else {
          currRow[j] = 1 + Math.min(prevRow[j], currRow[j - 1], prevRow[j - 1]);
        }
      }
      // Swap rows
      [prevRow, currRow] = [currRow, prevRow];
    }

    return prevRow[n];
  }

  /**
   * Calculate Dice coefficient (Sorensen-Dice)
   * DSC(A,B) = 2|A ∩ B| / (|A| + |B|)
   */
  private _diceSimilarity(tokens1: string[], tokens2: string[]): number {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    const intersection = Array.from(set1).filter((x) => set2.has(x));

    const totalSize = set1.size + set2.size;
    if (totalSize === 0) {
      return 1.0;
    }

    return (2 * intersection.length) / totalSize;
  }

  /**
   * Calculate overlap coefficient
   * O(A,B) = |A ∩ B| / min(|A|, |B|)
   */
  private _overlapCoefficient(tokens1: string[], tokens2: string[]): number {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    const intersection = Array.from(set1).filter((x) => set2.has(x));
    const minSize = Math.min(set1.size, set2.size);

    if (minSize === 0) {
      return 1.0;
    }
    return intersection.length / minSize;
  }

  /**
   * Override score to add detailed similarity metrics
   */
  async score(input: ScorerInput): Promise<ScoreResult> {
    const reference = this._getReferenceText(input);

    if (!reference) {
      return this.createScoreResult(
        10,
        "No reference text available for comparison - passing by default",
        {
          metadata: {
            noReferenceText: true,
            compareWith: this._similarityConfig.compareWith ?? "groundTruth",
          },
        },
      );
    }

    // Calculate all metrics for detailed reporting
    const metrics = this._similarityConfig.metrics ?? [
      this._similarityConfig.metric ?? "jaccard",
    ];
    const details: SimilarityDetails[] = [];

    for (const metric of metrics) {
      const score = this._calculateSimilarity(
        input.response,
        reference,
        metric,
      );
      const responseTokens = this._tokenize(
        this._similarityConfig.normalizeText
          ? this._normalizeText(input.response)
          : input.response,
      );
      const referenceTokens = this._tokenize(
        this._similarityConfig.normalizeText
          ? this._normalizeText(reference)
          : reference,
      );

      details.push({
        metric,
        score,
        responseTokens: responseTokens.length,
        referenceTokens: referenceTokens.length,
      });
    }

    // Calculate combined score
    const combinedScore = this._combineMetricScores(details);
    const normalizedScore = combinedScore * 10; // Scale to 0-10

    return this.createScoreResult(
      normalizedScore,
      this._generateSimilarityReasoning(details, combinedScore),
      {
        metadata: {
          similarityDetails:
            details as unknown as import("../../../types/index.js").JsonArray,
          combinedScore,
          compareWith: this._similarityConfig.compareWith ?? "groundTruth",
          tokenLevel: this._similarityConfig.tokenLevel ?? "word",
        },
      },
    );
  }

  /**
   * Combine multiple metric scores
   */
  private _combineMetricScores(details: SimilarityDetails[]): number {
    if (details.length === 0) {
      return 1.0;
    }
    if (details.length === 1) {
      return details[0].score;
    }

    const combination = this._similarityConfig.metricCombination ?? "average";
    const weights: Record<string, number> =
      this._similarityConfig.metricWeights ?? {};

    switch (combination) {
      case "min":
        return Math.min(...details.map((d) => d.score));

      case "max":
        return Math.max(...details.map((d) => d.score));

      case "weighted": {
        let totalWeight = 0;
        let weightedSum = 0;
        for (const detail of details) {
          const weight = weights[detail.metric] ?? 1.0;
          totalWeight += weight;
          weightedSum += detail.score * weight;
        }
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
      }

      case "average":
      default:
        return details.reduce((sum, d) => sum + d.score, 0) / details.length;
    }
  }

  /**
   * Generate reasoning from similarity details
   */
  private _generateSimilarityReasoning(
    details: SimilarityDetails[],
    combinedScore: number,
  ): string {
    const parts: string[] = [];

    for (const detail of details) {
      parts.push(`${detail.metric}: ${(detail.score * 100).toFixed(1)}%`);
    }

    const overallPct = (combinedScore * 100).toFixed(1);
    return `Similarity scores - ${parts.join(", ")}. Overall: ${overallPct}%`;
  }
}

/**
 * Factory function for creating ContentSimilarityScorer instances
 */
export async function createContentSimilarityScorer(
  config?: ContentSimilarityConfig,
): Promise<ContentSimilarityScorer> {
  return new ContentSimilarityScorer(config);
}
