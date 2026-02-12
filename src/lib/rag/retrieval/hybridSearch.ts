/**
 * Hybrid Search Implementation
 *
 * Combines vector (dense) search with BM25 (sparse) search for improved retrieval.
 * Supports multiple fusion methods: Reciprocal Rank Fusion (RRF) and Linear Combination.
 */

import { ProviderFactory } from "../../factories/providerFactory.js";
import { logger } from "../../utils/logger.js";
import { rerank } from "../reranker/reranker.js";
import type {
  BM25Result,
  HybridSearchConfig,
  HybridSearchResult,
} from "../types.js";
import type { BM25Index, HybridSearchOptions } from "../../types/ragTypes.js";

export type { BM25Index } from "../../types/ragTypes.js";

/**
 * In-memory BM25 implementation for testing and development
 */
export class InMemoryBM25Index implements BM25Index {
  private documents: Map<
    string,
    { text: string; tokens: string[]; metadata: Record<string, unknown> }
  > = new Map();
  private avgDocLength = 0;
  private k1 = 1.5; // BM25 parameter
  private b = 0.75; // BM25 parameter

  async search(query: string, topK = 10): Promise<BM25Result[]> {
    const queryTokens = this.tokenize(query);

    if (queryTokens.length === 0 || this.documents.size === 0) {
      return [];
    }

    // Calculate IDF for each query term
    const idfValues = new Map<string, number>();
    for (const token of queryTokens) {
      const docCount = this.countDocumentsWithTerm(token);
      const idf = Math.log(
        (this.documents.size - docCount + 0.5) / (docCount + 0.5) + 1,
      );
      idfValues.set(token, idf);
    }

    // Calculate BM25 score for each document
    const scores: Array<{
      id: string;
      score: number;
      text: string;
      metadata: Record<string, unknown>;
    }> = [];

    for (const [id, doc] of this.documents) {
      let score = 0;
      const docLength = doc.tokens.length;

      for (const token of queryTokens) {
        const tf = this.countTermFrequency(doc.tokens, token);
        const idf = idfValues.get(token) || 0;

        // BM25 scoring formula
        const numerator = tf * (this.k1 + 1);
        const denominator =
          tf +
          this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));

        score += idf * (numerator / denominator);
      }

      if (score > 0) {
        scores.push({
          id,
          score,
          text: doc.text,
          metadata: doc.metadata,
        });
      }
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK);
  }

  async addDocuments(
    documents: Array<{
      id: string;
      text: string;
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    for (const doc of documents) {
      const tokens = this.tokenize(doc.text);
      this.documents.set(doc.id, {
        text: doc.text,
        tokens,
        metadata: doc.metadata || {},
      });
    }

    // Recalculate average document length
    let totalLength = 0;
    for (const doc of this.documents.values()) {
      totalLength += doc.tokens.length;
    }
    this.avgDocLength =
      this.documents.size > 0 ? totalLength / this.documents.size : 0;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }

  private countTermFrequency(tokens: string[], term: string): number {
    return tokens.filter((t) => t === term).length;
  }

  private countDocumentsWithTerm(term: string): number {
    let count = 0;
    for (const doc of this.documents.values()) {
      if (doc.tokens.includes(term)) {
        count++;
      }
    }
    return count;
  }
}

/**
 * Reciprocal Rank Fusion
 * Combines rankings from multiple retrieval methods
 *
 * @param rankings - Array of ranking lists, each with id and rank
 * @param k - RRF constant (default: 60)
 * @returns Map of document IDs to fused scores
 */
export function reciprocalRankFusion(
  rankings: Array<Array<{ id: string; rank: number }>>,
  k = 60,
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const ranking of rankings) {
    for (const { id, rank } of ranking) {
      const currentScore = scores.get(id) || 0;
      scores.set(id, currentScore + 1 / (k + rank));
    }
  }

  return scores;
}

/**
 * Linear Combination of normalized scores
 *
 * @param vectorScores - Vector search scores
 * @param bm25Scores - BM25 search scores
 * @param alpha - Weight for vector scores (0-1), bm25 gets 1-alpha
 * @returns Map of document IDs to combined scores
 */
export function linearCombination(
  vectorScores: Map<string, number>,
  bm25Scores: Map<string, number>,
  alpha = 0.5,
): Map<string, number> {
  const combined = new Map<string, number>();

  // Get all document IDs
  const allIds = new Set([...vectorScores.keys(), ...bm25Scores.keys()]);

  // Normalize scores
  const normalizedVector = normalizeScores(vectorScores);
  const normalizedBM25 = normalizeScores(bm25Scores);

  for (const id of allIds) {
    const vectorScore = normalizedVector.get(id) || 0;
    const bm25Score = normalizedBM25.get(id) || 0;
    combined.set(id, alpha * vectorScore + (1 - alpha) * bm25Score);
  }

  return combined;
}

/**
 * Normalize scores to 0-1 range
 */
function normalizeScores(scores: Map<string, number>): Map<string, number> {
  const values = Array.from(scores.values());
  if (values.length === 0) {
    return new Map();
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const normalized = new Map<string, number>();
  for (const [id, score] of scores) {
    normalized.set(id, (score - min) / range);
  }

  return normalized;
}

export type { HybridSearchOptions } from "../../types/ragTypes.js";

/**
 * Create a hybrid search function
 *
 * @param options - Search options
 * @returns Hybrid search function
 */
export function createHybridSearch(options: HybridSearchOptions) {
  const {
    vectorStore,
    bm25Index,
    indexName,
    embeddingModel,
    defaultConfig = {},
  } = options;

  /**
   * Execute hybrid search combining vector and BM25 retrieval
   *
   * @param query - Search query
   * @param config - Search configuration
   * @returns Hybrid search results
   */
  return async function hybridSearch(
    query: string,
    config?: HybridSearchConfig,
  ): Promise<HybridSearchResult[]> {
    const startTime = Date.now();

    const {
      vectorWeight = defaultConfig.vectorWeight ?? 0.5,
      bm25Weight = defaultConfig.bm25Weight ?? 0.5,
      fusionMethod = defaultConfig.fusionMethod ?? "rrf",
      rrfK = defaultConfig.rrfK ?? 60,
      topK = defaultConfig.topK ?? 10,
      enableReranking = defaultConfig.enableReranking ?? false,
      reranker: rerankerConfig = defaultConfig.reranker,
    } = config || {};

    try {
      // Generate query embedding
      const embeddingProvider = await ProviderFactory.createProvider(
        embeddingModel?.provider,
        embeddingModel?.modelName,
      );

      if (
        typeof (embeddingProvider as unknown as Record<string, unknown>)
          .embed !== "function"
      ) {
        throw new Error(
          `Embedding provider does not support the embed() method. ` +
            `Please use a provider that supports embeddings (e.g., OpenAI text-embedding-3-small, Vertex text-embedding-004).`,
        );
      }

      const queryEmbedding = await (
        embeddingProvider as unknown as {
          embed: (s: string) => Promise<number[]>;
        }
      ).embed(query);

      // Parallel retrieval
      const [vectorResults, bm25Results] = await Promise.all([
        vectorStore.query({
          indexName,
          queryVector: queryEmbedding,
          topK: topK * 2, // Get more for fusion
        }),
        bm25Index.search(query, topK * 2),
      ]);

      // Fuse results
      let fusedResults: HybridSearchResult[];

      if (fusionMethod === "rrf") {
        // Reciprocal Rank Fusion
        const vectorRanking = vectorResults.map((r, i) => ({
          id: r.id,
          rank: i + 1,
        }));
        const bm25Ranking = bm25Results.map((r, i) => ({
          id: r.id,
          rank: i + 1,
        }));

        const rrfScores = reciprocalRankFusion(
          [vectorRanking, bm25Ranking],
          rrfK,
        );

        // Combine with original data
        const resultMap = new Map<
          string,
          { text: string; metadata?: Record<string, unknown> }
        >();
        for (const r of vectorResults) {
          resultMap.set(r.id, { text: r.text || "", metadata: r.metadata });
        }
        for (const r of bm25Results) {
          if (!resultMap.has(r.id)) {
            resultMap.set(r.id, { text: r.text, metadata: r.metadata });
          }
        }

        fusedResults = Array.from(rrfScores.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, topK)
          .map(([id, score]) => ({
            id,
            score,
            text: resultMap.get(id)?.text || "",
            metadata: resultMap.get(id)?.metadata,
            scores: {
              combined: score,
            },
          }));
      } else {
        // Linear combination
        const vectorScoreMap = new Map(
          vectorResults.map((r) => [r.id, r.score || 0]),
        );
        const bm25ScoreMap = new Map(bm25Results.map((r) => [r.id, r.score]));

        // Adjust weights based on config
        const totalWeight = vectorWeight + bm25Weight;
        const normalizedVectorWeight = vectorWeight / totalWeight;

        const combinedScores = linearCombination(
          vectorScoreMap,
          bm25ScoreMap,
          normalizedVectorWeight,
        );

        // Combine with original data
        const resultMap = new Map<
          string,
          {
            text: string;
            metadata?: Record<string, unknown>;
            vectorScore?: number;
            bm25Score?: number;
          }
        >();
        for (const r of vectorResults) {
          resultMap.set(r.id, {
            text: r.text || "",
            metadata: r.metadata,
            vectorScore: r.score,
          });
        }
        for (const r of bm25Results) {
          const existing = resultMap.get(r.id);
          if (existing) {
            existing.bm25Score = r.score;
          } else {
            resultMap.set(r.id, {
              text: r.text,
              metadata: r.metadata,
              bm25Score: r.score,
            });
          }
        }

        fusedResults = Array.from(combinedScores.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, topK)
          .map(([id, score]) => {
            const data = resultMap.get(id);
            return {
              id,
              score,
              text: data?.text || "",
              metadata: data?.metadata,
              scores: {
                vector: data?.vectorScore,
                bm25: data?.bm25Score,
                combined: score,
              },
            };
          });
      }

      // Apply reranking if configured
      if (enableReranking && rerankerConfig && fusedResults.length > 0) {
        const rerankerModel = await ProviderFactory.createProvider(
          rerankerConfig.model.provider,
          rerankerConfig.model.modelName,
        );

        const rerankedResults = await rerank(
          fusedResults.map((r) => ({
            id: r.id,
            text: r.text,
            score: r.score,
            metadata: r.metadata,
          })),
          query,
          rerankerModel,
          {
            weights: rerankerConfig.weights,
            topK: rerankerConfig.topK || topK,
          },
        );

        fusedResults = rerankedResults.map((r) => ({
          id: r.result.id,
          score: r.score,
          text: r.result.text || "",
          metadata: r.result.metadata,
          scores: {
            ...(fusedResults.find((f) => f.id === r.result.id)?.scores || {}),
            reranked: r.score,
          },
        }));
      }

      const queryTime = Date.now() - startTime;

      logger.info("[HybridSearch] Search completed", {
        query: query.slice(0, 50),
        vectorResults: vectorResults.length,
        bm25Results: bm25Results.length,
        fusedResults: fusedResults.length,
        fusionMethod,
        queryTime,
      });

      return fusedResults;
    } catch (error) {
      logger.error("[HybridSearch] Search failed", {
        query: query.slice(0, 50),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}
