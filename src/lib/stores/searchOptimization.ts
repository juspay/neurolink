/**
 * Search Optimization Utilities
 * Implements Reciprocal Rank Fusion (RRF), hybrid search, and reranking utilities
 */

import type { VectorQueryResult } from "../types/vectorTypes.js";
import type { UnknownRecord } from "../types/common.js";

/**
 * Options for Reciprocal Rank Fusion
 */
export type RRFOptions = {
  /** Constant k in RRF formula (default: 60) */
  k?: number;
  /** Maximum number of results to return */
  topK?: number;
  /** Minimum score threshold */
  minScore?: number;
};

/**
 * Options for hybrid search
 */
export type HybridSearchOptions<
  TMetadata extends UnknownRecord = UnknownRecord,
> = {
  /** Number of results to return */
  topK?: number;
  /** Weight for dense (vector) results (0-1) */
  alpha?: number;
  /** Whether to rerank results */
  rerank?: boolean;
  /** Oversampling factor for reranking */
  oversampleFactor?: number;
  /** Minimum score threshold */
  minScore?: number;
  /** Include metadata in results */
  includeMetadata?: boolean;
};

/**
 * Ranked result for fusion operations
 */
export type RankedResult<TMetadata extends UnknownRecord = UnknownRecord> = {
  id: string;
  score: number;
  rank: number;
  metadata?: TMetadata;
  content?: string;
  vector?: number[];
  source?: string;
};

/**
 * Sparse search result (for BM25 or similar)
 */
export type SparseSearchResult = {
  id: string;
  score: number;
  content?: string;
  metadata?: UnknownRecord;
};

/**
 * Reciprocal Rank Fusion (RRF)
 * Combines multiple ranking lists using the RRF formula:
 * score = sum(1 / (k + rank_i)) for each ranking list
 *
 * @param rankings Array of ranking maps (id -> rank, 1-indexed)
 * @param options RRF options
 * @returns Fused results sorted by score
 */
export function reciprocalRankFusion<
  TMetadata extends UnknownRecord = UnknownRecord,
>(
  rankings: Array<Map<string, RankedResult<TMetadata>>>,
  options: RRFOptions = {},
): RankedResult<TMetadata>[] {
  const k = options.k ?? 60;
  const topK = options.topK ?? 100;
  const minScore = options.minScore ?? 0;

  const scores = new Map<string, number>();
  const metadata = new Map<string, RankedResult<TMetadata>>();

  // Calculate RRF scores
  for (const ranking of rankings) {
    for (const [id, result] of ranking.entries()) {
      const current = scores.get(id) || 0;
      scores.set(id, current + 1 / (k + result.rank));

      // Keep metadata from first occurrence
      if (!metadata.has(id)) {
        metadata.set(id, result);
      }
    }
  }

  // Convert to sorted array
  const results: RankedResult<TMetadata>[] = [];
  for (const [id, score] of scores.entries()) {
    if (score >= minScore) {
      const meta = metadata.get(id);
      results.push({
        id,
        score,
        rank: 0, // Will be set after sorting
        metadata: meta?.metadata,
        content: meta?.content,
        vector: meta?.vector,
      });
    }
  }

  // Sort by score descending and assign ranks
  results.sort((a, b) => b.score - a.score);
  results.forEach((r, i) => (r.rank = i + 1));

  return results.slice(0, topK);
}

/**
 * Convert vector query results to ranking map
 * @param results Vector query results
 * @param source Optional source identifier
 * @returns Map of id to ranked result
 */
export function toRankingMap<TMetadata extends UnknownRecord = UnknownRecord>(
  results: VectorQueryResult<TMetadata>[],
  source?: string,
): Map<string, RankedResult<TMetadata>> {
  const map = new Map<string, RankedResult<TMetadata>>();

  results.forEach((result, index) => {
    map.set(result.id, {
      id: result.id,
      score: result.score,
      rank: index + 1,
      metadata: result.metadata,
      content: result.content,
      vector: result.vector,
      source,
    });
  });

  return map;
}

/**
 * Convert sparse search results to ranking map
 * @param results Sparse search results
 * @param source Optional source identifier
 * @returns Map of id to ranked result
 */
export function sparseToRankingMap(
  results: SparseSearchResult[],
  source?: string,
): Map<string, RankedResult> {
  const map = new Map<string, RankedResult>();

  results.forEach((result, index) => {
    map.set(result.id, {
      id: result.id,
      score: result.score,
      rank: index + 1,
      content: result.content,
      metadata: result.metadata,
      source,
    });
  });

  return map;
}

/**
 * Linear combination of scores
 * Useful for simple weighted fusion of two result sets
 *
 * @param denseResults Dense (vector) search results
 * @param sparseResults Sparse (BM25) search results
 * @param alpha Weight for dense results (0-1), sparse weight is (1-alpha)
 * @param topK Number of results to return
 * @returns Combined results
 */
export function linearCombination<
  TMetadata extends UnknownRecord = UnknownRecord,
>(
  denseResults: VectorQueryResult<TMetadata>[],
  sparseResults: SparseSearchResult[],
  alpha: number = 0.5,
  topK: number = 10,
): RankedResult<TMetadata>[] {
  const scores = new Map<string, number>();
  const metadata = new Map<string, RankedResult<TMetadata>>();

  // Normalize scores to 0-1 range
  const normalizeDense = normalizeScores(denseResults.map((r) => r.score));
  const normalizeSparse = normalizeScores(sparseResults.map((r) => r.score));

  // Add dense scores
  denseResults.forEach((result, i) => {
    const normalizedScore = normalizeDense[i];
    scores.set(result.id, alpha * normalizedScore);
    metadata.set(result.id, {
      id: result.id,
      score: result.score,
      rank: i + 1,
      metadata: result.metadata,
      content: result.content,
      vector: result.vector,
      source: "dense",
    });
  });

  // Add sparse scores
  sparseResults.forEach((result, i) => {
    const normalizedScore = normalizeSparse[i];
    const existing = scores.get(result.id) || 0;
    scores.set(result.id, existing + (1 - alpha) * normalizedScore);

    if (!metadata.has(result.id)) {
      metadata.set(result.id, {
        id: result.id,
        score: result.score,
        rank: i + 1,
        content: result.content,
        metadata: result.metadata as TMetadata,
        source: "sparse",
      });
    }
  });

  // Convert to sorted array
  const results: RankedResult<TMetadata>[] = [];
  for (const [id, score] of scores.entries()) {
    const meta = metadata.get(id);
    results.push({
      id,
      score,
      rank: 0,
      metadata: meta?.metadata,
      content: meta?.content,
      vector: meta?.vector,
      source: meta?.source,
    });
  }

  results.sort((a, b) => b.score - a.score);
  results.forEach((r, i) => (r.rank = i + 1));

  return results.slice(0, topK);
}

/**
 * Normalize scores to 0-1 range using min-max normalization
 * @param scores Array of scores
 * @returns Normalized scores
 */
export function normalizeScores(scores: number[]): number[] {
  if (scores.length === 0) {return [];}
  if (scores.length === 1) {return [1];}

  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min;

  if (range === 0) {return scores.map(() => 1);}

  return scores.map((s) => (s - min) / range);
}

/**
 * Score normalization using z-score standardization
 * @param scores Array of scores
 * @returns Standardized scores
 */
export function zScoreNormalize(scores: number[]): number[] {
  if (scores.length === 0) {return [];}
  if (scores.length === 1) {return [0];}

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {return scores.map(() => 0);}

  return scores.map((s) => (s - mean) / stdDev);
}

/**
 * Calculate cosine similarity between two vectors
 * @param a First vector
 * @param b Second vector
 * @returns Cosine similarity (-1 to 1)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimension");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) {return 0;}

  return dotProduct / magnitude;
}

/**
 * Calculate euclidean distance between two vectors
 * @param a First vector
 * @param b Second vector
 * @returns Euclidean distance
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimension");
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }

  return Math.sqrt(sum);
}

/**
 * Calculate dot product between two vectors
 * @param a First vector
 * @param b Second vector
 * @returns Dot product
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimension");
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }

  return sum;
}

/**
 * Rescore results using a custom scoring function
 * Useful for reranking after binary quantization search
 *
 * @param results Results to rescore
 * @param queryVector Query vector
 * @param scoreFn Scoring function (default: cosine similarity)
 * @param topK Number of results to return
 * @returns Rescored results
 */
export function rescoreResults<TMetadata extends UnknownRecord = UnknownRecord>(
  results: RankedResult<TMetadata>[],
  queryVector: number[],
  scoreFn: (a: number[], b: number[]) => number = cosineSimilarity,
  topK?: number,
): RankedResult<TMetadata>[] {
  // Only rescore results that have vectors
  const resultsWithVectors = results.filter((r) => r.vector);

  const rescored = resultsWithVectors.map((result) => ({
    ...result,
    score: scoreFn(queryVector, result.vector!),
  }));

  // Sort by new scores
  rescored.sort((a, b) => b.score - a.score);
  rescored.forEach((r, i) => (r.rank = i + 1));

  return topK ? rescored.slice(0, topK) : rescored;
}

/**
 * Maximal Marginal Relevance (MMR) for result diversification
 * Balances relevance with diversity to reduce redundancy in results
 *
 * @param results Candidate results (must have vectors)
 * @param queryVector Query vector
 * @param lambda Trade-off parameter (0-1, higher = more relevance, lower = more diversity)
 * @param topK Number of results to return
 * @returns Diversified results
 */
export function maximalMarginalRelevance<
  TMetadata extends UnknownRecord = UnknownRecord,
>(
  results: RankedResult<TMetadata>[],
  queryVector: number[],
  lambda: number = 0.5,
  topK: number = 10,
): RankedResult<TMetadata>[] {
  const resultsWithVectors = results.filter((r) => r.vector);
  if (resultsWithVectors.length === 0) {return [];}

  const selected: RankedResult<TMetadata>[] = [];
  const remaining = [...resultsWithVectors];

  while (selected.length < topK && remaining.length > 0) {
    let bestScore = -Infinity;
    let bestIndex = 0;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];

      // Relevance to query
      const relevance = cosineSimilarity(queryVector, candidate.vector!);

      // Maximum similarity to already selected results
      let maxSim = 0;
      for (const sel of selected) {
        const sim = cosineSimilarity(candidate.vector!, sel.vector!);
        maxSim = Math.max(maxSim, sim);
      }

      // MMR score
      const mmrScore = lambda * relevance - (1 - lambda) * maxSim;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIndex = i;
      }
    }

    // Add best candidate to selected
    const best = remaining.splice(bestIndex, 1)[0];
    best.score = bestScore;
    best.rank = selected.length + 1;
    selected.push(best);
  }

  return selected;
}

/**
 * Batch processing utilities
 */

/**
 * Split items into batches
 * @param items Items to split
 * @param batchSize Size of each batch
 * @returns Array of batches
 */
export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Process items in batches with concurrency control
 * @param items Items to process
 * @param batchSize Size of each batch
 * @param processFn Function to process each batch
 * @param concurrency Maximum concurrent batches
 * @returns Combined results
 */
export async function processBatches<T, R>(
  items: T[],
  batchSize: number,
  processFn: (batch: T[]) => Promise<R[]>,
  concurrency: number = 3,
): Promise<R[]> {
  const batches = splitIntoBatches(items, batchSize);
  const results: R[] = [];

  for (let i = 0; i < batches.length; i += concurrency) {
    const batchPromises = batches
      .slice(i, i + concurrency)
      .map((batch) => processFn(batch));

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.flat());
  }

  return results;
}

/**
 * Quantization utilities for storage optimization
 */

/**
 * Scalar quantization (float32 to int8)
 * @param vector Float32 vector
 * @returns Int8 quantized vector
 */
export function scalarQuantize(vector: number[]): number[] {
  const min = Math.min(...vector);
  const max = Math.max(...vector);
  const range = max - min;

  if (range === 0) {return vector.map(() => 0);}

  return vector.map((v) => Math.round(((v - min) / range) * 255) - 128);
}

/**
 * Binary quantization (float32 to binary)
 * @param vector Float32 vector
 * @returns Binary vector (0 or 1)
 */
export function binaryQuantize(vector: number[]): number[] {
  // For zero-centered embeddings, use 0 as threshold
  // For non-zero-centered, use mean
  const mean = vector.reduce((a, b) => a + b, 0) / vector.length;
  const threshold = Math.abs(mean) < 0.1 ? 0 : mean;

  return vector.map((v) => (v >= threshold ? 1 : 0));
}

/**
 * Compute Hamming distance between binary vectors
 * @param a First binary vector
 * @param b Second binary vector
 * @returns Hamming distance (number of differing bits)
 */
export function hammingDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimension");
  }

  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {distance++;}
  }

  return distance;
}
