/**
 * Reranker Implementation
 *
 * Multi-factor scoring system for reranking retrieval results.
 * Combines semantic relevance (LLM-based), vector similarity, and position.
 */

import type {
  VectorQueryResult,
  RerankerOptions,
  RerankResult,
  AIProvider,
} from "../../types/index.js";
import { withSpan } from "../../telemetry/withSpan.js";
import { tracers } from "../../telemetry/tracers.js";
import { logger } from "../../utils/logger.js";

/**
 * Default scoring weights
 */
const DEFAULT_WEIGHTS = {
  semantic: 0.4,
  vector: 0.4,
  position: 0.2,
};

/**
 * Rerank vector search results using multi-factor scoring
 *
 * Combines three scoring factors:
 * 1. Semantic score: LLM-based relevance assessment
 * 2. Vector score: Original similarity score from vector search
 * 3. Position score: Inverse of original ranking position
 *
 * @param results - Vector search results to rerank
 * @param query - Original search query
 * @param model - Language model for semantic scoring
 * @param options - Reranking options
 * @returns Reranked results with detailed scores
 */
export async function rerank(
  results: VectorQueryResult[],
  query: string,
  model: AIProvider,
  options?: RerankerOptions,
): Promise<RerankResult[]> {
  return withSpan(
    {
      name: "neurolink.rag.rerank",
      tracer: tracers.rag,
      attributes: {
        "rag.reranker.input_count": results.length,
        "rag.reranker.top_k": options?.topK ?? 3,
        "rag.reranker.query_length": query.length,
      },
    },
    async (span) => {
      const {
        queryEmbedding: _queryEmbedding,
        topK = 3,
        weights = DEFAULT_WEIGHTS,
      } = options || {};

      if (results.length === 0) {
        span.setAttribute("rag.reranker.output_count", 0);
        return [];
      }

      // Validate weights sum to 1.0
      const totalWeight =
        (weights.semantic || DEFAULT_WEIGHTS.semantic) +
        (weights.vector || DEFAULT_WEIGHTS.vector) +
        (weights.position || DEFAULT_WEIGHTS.position);

      if (Math.abs(totalWeight - 1.0) > 0.01) {
        logger.warn("[Reranker] Weights do not sum to 1.0, normalizing", {
          original: weights,
          total: totalWeight,
        });
      }

      const normalizedWeights = {
        semantic: (weights.semantic || DEFAULT_WEIGHTS.semantic) / totalWeight,
        vector: (weights.vector || DEFAULT_WEIGHTS.vector) / totalWeight,
        position: (weights.position || DEFAULT_WEIGHTS.position) / totalWeight,
      };

      const rerankedResults: RerankResult[] = [];

      // Process results in parallel batches for efficiency
      const batchSize = 5;
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        const batchPromises = batch.map(async (result, batchIndex) => {
          const globalIndex = i + batchIndex;

          // Calculate vector score (use existing score or 0)
          const vectorScore = result.score ?? 0;

          // Calculate position score (inverse of position)
          const positionScore = 1 - globalIndex / results.length;

          // Calculate semantic score using LLM
          const semanticResult = await calculateSemanticScore(
            query,
            result.text || (result.metadata?.text as string) || "",
            model,
          );

          // Combine scores
          const combinedScore =
            normalizedWeights.semantic * semanticResult.score +
            normalizedWeights.vector * vectorScore +
            normalizedWeights.position * positionScore;

          return {
            result,
            score: combinedScore,
            details: {
              semantic: semanticResult.score,
              vector: vectorScore,
              position: positionScore,
              queryAnalysis: semanticResult.analysis,
            },
          };
        });

        const batchResults = await Promise.all(batchPromises);
        rerankedResults.push(...batchResults);
      }

      // Sort by combined score descending
      rerankedResults.sort((a, b) => b.score - a.score);

      // Return top K results
      const output = rerankedResults.slice(0, topK);
      span.setAttribute("rag.reranker.output_count", output.length);
      return output;
    },
  ); // end withSpan
}

/**
 * Calculate semantic relevance score using LLM
 *
 * @param query - Search query
 * @param text - Document text to score
 * @param model - Language model for scoring
 * @returns Score between 0 and 1 with optional analysis
 */
async function calculateSemanticScore(
  query: string,
  text: string,
  model: AIProvider,
): Promise<{ score: number; analysis?: string }> {
  const prompt = `Rate the relevance of the following text to the query on a scale of 0 to 1.

Query: ${query}

Text: ${text.slice(0, 1000)}

Respond with only a number between 0 and 1, where:
- 0 means completely irrelevant
- 0.5 means somewhat relevant
- 1 means highly relevant

Score:`;

  try {
    const result = await model.generate({
      prompt,
      maxTokens: 10,
      temperature: 0,
    });

    const scoreText = result?.content?.trim() || "0";
    const score = parseFloat(scoreText);

    if (isNaN(score) || score < 0 || score > 1) {
      return { score: 0.5 };
    }

    return { score };
  } catch (error) {
    logger.warn("[Reranker] Semantic scoring failed, using default", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { score: 0.5 };
  }
}

/**
 * Batch rerank with optimized LLM calls
 * Scores multiple documents in a single prompt for efficiency
 *
 * @param results - Results to rerank
 * @param query - Search query
 * @param model - Language model
 * @param options - Reranking options
 * @returns Reranked results
 */
export async function batchRerank(
  results: VectorQueryResult[],
  query: string,
  model: AIProvider,
  options?: RerankerOptions,
): Promise<RerankResult[]> {
  return withSpan(
    {
      name: "neurolink.rag.batchRerank",
      tracer: tracers.rag,
      attributes: {
        "rag.reranker.input_count": results.length,
        "rag.reranker.top_k": options?.topK ?? 3,
        "rag.reranker.query_length": query.length,
        "rag.reranker.batch": true,
      },
    },
    async (span) => {
      const { topK = 3, weights = DEFAULT_WEIGHTS } = options || {};

      if (results.length === 0) {
        span.setAttribute("rag.reranker.output_count", 0);
        return [];
      }

      // Normalize weights
      const totalWeight =
        (weights.semantic || DEFAULT_WEIGHTS.semantic) +
        (weights.vector || DEFAULT_WEIGHTS.vector) +
        (weights.position || DEFAULT_WEIGHTS.position);

      const normalizedWeights = {
        semantic: (weights.semantic || DEFAULT_WEIGHTS.semantic) / totalWeight,
        vector: (weights.vector || DEFAULT_WEIGHTS.vector) / totalWeight,
        position: (weights.position || DEFAULT_WEIGHTS.position) / totalWeight,
      };

      // Build batch scoring prompt
      const documentsText = results
        .map(
          (r, i) =>
            `[${i + 1}] ${(r.text || (r.metadata?.text as string) || "").slice(0, 300)}`,
        )
        .join("\n\n");

      const prompt = `Rate the relevance of each document to the query on a scale of 0 to 1.

Query: ${query}

Documents:
${documentsText}

For each document, provide a score between 0 and 1.
Respond with only the scores, one per line, in order:`;

      try {
        const result = await model.generate({
          prompt,
          maxTokens: 50,
          temperature: 0,
        });

        // Parse scores from response
        const scoreLines = (result?.content || "")
          .trim()
          .split("\n")
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0);

        const semanticScores: number[] = [];
        for (let i = 0; i < results.length; i++) {
          const scoreLine = scoreLines[i];
          if (scoreLine) {
            const score = parseFloat(scoreLine.match(/[\d.]+/)?.[0] || "0.5");
            semanticScores.push(
              isNaN(score) || score < 0 || score > 1 ? 0.5 : score,
            );
          } else {
            semanticScores.push(0.5);
          }
        }

        // Calculate combined scores
        const rerankedResults: RerankResult[] = results.map((result, i) => {
          const vectorScore = result.score ?? 0;
          const positionScore = 1 - i / results.length;
          const semanticScore = semanticScores[i] ?? 0.5;

          const combinedScore =
            normalizedWeights.semantic * semanticScore +
            normalizedWeights.vector * vectorScore +
            normalizedWeights.position * positionScore;

          return {
            result,
            score: combinedScore,
            details: {
              semantic: semanticScore,
              vector: vectorScore,
              position: positionScore,
            },
          };
        });

        // Sort and return top K
        rerankedResults.sort((a, b) => b.score - a.score);
        const output = rerankedResults.slice(0, topK);
        span.setAttribute("rag.reranker.output_count", output.length);
        return output;
      } catch (error) {
        logger.warn(
          "[Reranker] Batch scoring failed, using individual scoring",
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
        // Fall back to individual scoring
        return rerank(results, query, model, options);
      }
    },
  ); // end withSpan
}

/**
 * Simple position-based reranker (no LLM required)
 * Uses only vector score and position
 *
 * @param results - Results to rerank
 * @param options - Reranking options
 * @returns Reranked results
 */
export function simpleRerank(
  results: VectorQueryResult[],
  options?: { topK?: number; vectorWeight?: number; positionWeight?: number },
): RerankResult[] {
  const { topK = 3, vectorWeight = 0.8, positionWeight = 0.2 } = options || {};

  const totalWeight = vectorWeight + positionWeight;
  const normalizedVectorWeight = vectorWeight / totalWeight;
  const normalizedPositionWeight = positionWeight / totalWeight;

  const rerankedResults: RerankResult[] = results.map((result, i) => {
    const vectorScore = result.score ?? 0;
    const positionScore = 1 - i / results.length;

    const combinedScore =
      normalizedVectorWeight * vectorScore +
      normalizedPositionWeight * positionScore;

    return {
      result,
      score: combinedScore,
      details: {
        semantic: 0,
        vector: vectorScore,
        position: positionScore,
      },
    };
  });

  rerankedResults.sort((a, b) => b.score - a.score);
  return rerankedResults.slice(0, topK);
}

/**
 * Cohere-style relevance scorer interface
 * Placeholder for integration with Cohere's rerank API
 */
export class CohereRelevanceScorer {
  private modelName: string;

  constructor(modelName = "rerank-v3.5") {
    this.modelName = modelName;
  }

  async score(
    _query: string,
    _documents: string[],
  ): Promise<Array<{ index: number; score: number }>> {
    // Placeholder - would use Cohere's rerank API
    throw new Error(
      "CohereRelevanceScorer requires Cohere API integration. " +
        "Install @cohere-ai/cohere and provide API key.",
    );
  }
}

/**
 * Cross-encoder style reranker interface
 * Placeholder for integration with cross-encoder models
 */
export class CrossEncoderReranker {
  private modelName: string;

  constructor(modelName = "ms-marco-MiniLM-L-6-v2") {
    this.modelName = modelName;
  }

  async rerank(
    _query: string,
    _documents: string[],
  ): Promise<Array<{ index: number; score: number }>> {
    // Placeholder - would use cross-encoder model
    throw new Error(
      "CrossEncoderReranker requires a cross-encoder model. " +
        "Consider using the LLM-based rerank function instead.",
    );
  }
}
