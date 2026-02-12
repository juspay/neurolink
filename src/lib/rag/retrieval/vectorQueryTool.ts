/**
 * Vector Query Tool
 *
 * Provides semantic search capabilities for RAG pipelines.
 * Integrates with vector stores and supports metadata filtering and reranking.
 */

import { randomUUID } from "crypto";
import { z } from "zod";
import { ProviderFactory } from "../../factories/providerFactory.js";
import { logger } from "../../utils/logger.js";
import { rerank } from "../reranker/reranker.js";
import type {
  MetadataFilter,
  RequestContext,
  VectorQueryResponse,
  VectorQueryResult,
  VectorQueryToolConfig,
} from "../types.js";
import type { VectorStore } from "../../types/ragTypes.js";

export type { VectorStore } from "../../types/ragTypes.js";

/**
 * Creates a vector query tool for semantic search
 * Follows NeuroLink's factory pattern
 *
 * @param config - Tool configuration
 * @param vectorStore - Vector store instance or resolver function
 * @returns Tool object with execute method
 */
export function createVectorQueryTool(
  config: VectorQueryToolConfig,
  vectorStore: VectorStore | ((context: RequestContext) => VectorStore),
) {
  const {
    id = `vector-query-${randomUUID().slice(0, 8)}`,
    description = "Access the knowledge base to find information needed to answer user questions",
    indexName,
    embeddingModel,
    enableFilter = false,
    includeVectors = false,
    includeSources = true,
    topK = 10,
    reranker: rerankerConfig,
    providerOptions,
  } = config;

  return {
    name: id,
    description,

    parameters: z.object({
      query: z
        .string()
        .describe("The search query to find relevant information"),
      ...(enableFilter
        ? {
            filter: z
              .record(z.unknown())
              .optional()
              .describe("Metadata filters to narrow down results"),
          }
        : {}),
      topK: z
        .number()
        .optional()
        .describe(`Number of results to return (default: ${topK})`),
    }),

    /**
     * Execute the vector query
     * @param params - Query parameters
     * @param context - Optional request context
     * @returns Query results with relevant context
     */
    execute: async (
      params: { query: string; filter?: MetadataFilter; topK?: number },
      context?: RequestContext,
    ): Promise<VectorQueryResponse> => {
      const startTime = Date.now();

      try {
        // Resolve vector store if it's a function
        const store: VectorStore =
          typeof vectorStore === "function"
            ? vectorStore(context || {})
            : vectorStore;

        // Generate query embedding
        const embeddingProvider = await ProviderFactory.createProvider(
          embeddingModel.provider,
          embeddingModel.modelName,
        );

        // Check if provider has embed method
        if (
          typeof (embeddingProvider as unknown as { embed?: unknown }).embed !==
          "function"
        ) {
          throw new Error(
            `Provider ${embeddingModel.provider} does not support embeddings`,
          );
        }

        const queryEmbedding = await (
          embeddingProvider as unknown as {
            embed: (s: string) => Promise<number[]>;
          }
        ).embed(params.query);

        // Query the vector store
        let results = await store.query({
          indexName,
          queryVector: queryEmbedding,
          topK: params.topK || topK,
          filter: params.filter,
          includeVectors,
          ...providerOptions,
        });

        let reranked = false;

        // Apply reranking if configured
        if (rerankerConfig && results.length > 0) {
          const rerankerModel = await ProviderFactory.createProvider(
            rerankerConfig.model.provider,
            rerankerConfig.model.modelName,
          );

          const rerankedResults = await rerank(
            results,
            params.query,
            rerankerModel,
            {
              weights: rerankerConfig.weights,
              topK: rerankerConfig.topK,
              queryEmbedding,
            },
          );

          results = rerankedResults.map((r) => r.result);
          reranked = true;
        }

        // Format results
        const relevantContext = results
          .map((r, i) => `[${i + 1}] ${r.metadata?.text || r.text || ""}`)
          .join("\n\n");

        const queryTime = Date.now() - startTime;

        logger.info("[VectorQueryTool] Query completed", {
          query: params.query.slice(0, 50),
          resultsCount: results.length,
          queryTime,
          reranked,
          filtered: !!params.filter,
        });

        return {
          relevantContext,
          sources: includeSources ? results : [],
          totalResults: results.length,
          metadata: {
            queryTime,
            reranked,
            filtered: !!params.filter,
          },
        };
      } catch (error) {
        logger.error("[VectorQueryTool] Query failed", {
          query: params.query.slice(0, 50),
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  };
}

/**
 * In-memory vector store implementation for testing and development
 */
export class InMemoryVectorStore implements VectorStore {
  private vectors: Map<
    string,
    Map<string, { vector: number[]; metadata: Record<string, unknown> }>
  > = new Map();

  /**
   * Add vectors to an index
   */
  async upsert(
    indexName: string,
    items: Array<{
      id: string;
      vector: number[];
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    let index = this.vectors.get(indexName);
    if (!index) {
      index = new Map();
      this.vectors.set(indexName, index);
    }
    for (const item of items) {
      index.set(item.id, {
        vector: item.vector,
        metadata: item.metadata || {},
      });
    }
  }

  /**
   * Query vectors by similarity
   */
  async query(params: {
    indexName: string;
    queryVector: number[];
    topK?: number;
    filter?: MetadataFilter;
    includeVectors?: boolean;
  }): Promise<VectorQueryResult[]> {
    const {
      indexName,
      queryVector,
      topK = 10,
      filter,
      includeVectors = false,
    } = params;

    const index = this.vectors.get(indexName);
    if (!index) {
      return [];
    }

    // Calculate similarities
    const results: Array<{
      id: string;
      score: number;
      metadata: Record<string, unknown>;
      vector?: number[];
    }> = [];

    for (const [id, data] of index) {
      // Apply filter if provided
      if (filter && !this.matchesFilter(data.metadata, filter)) {
        continue;
      }

      const score = this.cosineSimilarity(queryVector, data.vector);
      results.push({
        id,
        score,
        metadata: data.metadata,
        ...(includeVectors ? { vector: data.vector } : {}),
      });
    }

    // Sort by score descending and take top K
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK).map((r) => ({
      id: r.id,
      score: r.score,
      text: r.metadata.text as string | undefined,
      metadata: r.metadata,
      ...(includeVectors ? { vector: r.vector } : {}),
    }));
  }

  /**
   * Delete vectors from an index
   */
  async delete(indexName: string, ids: string[]): Promise<void> {
    const index = this.vectors.get(indexName);
    if (!index) {
      return;
    }

    for (const id of ids) {
      index.delete(id);
    }
  }

  /**
   * Check if metadata matches filter
   */
  private matchesFilter(
    metadata: Record<string, unknown>,
    filter: MetadataFilter,
  ): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (key.startsWith("$")) {
        // Logical operators
        switch (key) {
          case "$and":
            if (
              !(value as MetadataFilter[]).every((f) =>
                this.matchesFilter(metadata, f),
              )
            ) {
              return false;
            }
            break;
          case "$or":
            if (
              !(value as MetadataFilter[]).some((f) =>
                this.matchesFilter(metadata, f),
              )
            ) {
              return false;
            }
            break;
          case "$not":
            if (this.matchesFilter(metadata, value as MetadataFilter)) {
              return false;
            }
            break;
        }
      } else {
        // Field comparison
        const fieldValue = metadata[key];

        if (typeof value === "object" && value !== null) {
          // Comparison operators
          const ops = value as Record<string, unknown>;
          if ("$eq" in ops && fieldValue !== ops.$eq) {
            return false;
          }
          if ("$ne" in ops && fieldValue === ops.$ne) {
            return false;
          }
          if (
            "$gt" in ops &&
            (typeof fieldValue !== "number" ||
              fieldValue <= (ops.$gt as number))
          ) {
            return false;
          }
          if (
            "$gte" in ops &&
            (typeof fieldValue !== "number" ||
              fieldValue < (ops.$gte as number))
          ) {
            return false;
          }
          if (
            "$lt" in ops &&
            (typeof fieldValue !== "number" ||
              fieldValue >= (ops.$lt as number))
          ) {
            return false;
          }
          if (
            "$lte" in ops &&
            (typeof fieldValue !== "number" ||
              fieldValue > (ops.$lte as number))
          ) {
            return false;
          }
          if ("$in" in ops && !(ops.$in as unknown[]).includes(fieldValue)) {
            return false;
          }
          if ("$nin" in ops && (ops.$nin as unknown[]).includes(fieldValue)) {
            return false;
          }
          if (
            "$exists" in ops &&
            (ops.$exists ? fieldValue === undefined : fieldValue !== undefined)
          ) {
            return false;
          }
          if (
            "$contains" in ops &&
            (typeof fieldValue !== "string" ||
              !fieldValue.includes(ops.$contains as string))
          ) {
            return false;
          }
          if (
            "$regex" in ops &&
            (typeof fieldValue !== "string" ||
              !new RegExp(ops.$regex as string).test(fieldValue))
          ) {
            return false;
          }
        } else {
          // Direct equality
          if (fieldValue !== value) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}
