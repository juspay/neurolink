/**
 * Semantic Context Processor
 *
 * Searches for relevant context using semantic similarity and
 * enriches the input with contextual information from vector stores.
 *
 * @module semanticContextProcessor
 */

import type {
  InputProcessor,
  InputProcessorData,
  ProcessorResult,
  SemanticContextConfig,
} from "../../types/index.js";

/**
 * Create a Semantic Context Processor
 *
 * Retrieves relevant context using semantic similarity search from
 * vector stores and enriches the input with contextual information.
 *
 * @param defaultConfig - Default configuration
 * @returns InputProcessor instance
 *
 * @example Basic usage
 * ```typescript
 * const contextProcessor = createSemanticContextProcessor({
 *   vectorStore: 'pinecone',
 *   topK: 5,
 *   minScore: 0.7,
 * });
 *
 * const result = await contextProcessor.process(inputData);
 * ```
 *
 * @example With custom embedding function
 * ```typescript
 * const contextProcessor = createSemanticContextProcessor({
 *   embedFunction: async (text) => {
 *     // Custom embedding implementation
 *     return await myEmbeddingService.embed(text);
 *   },
 *   contextFormat: 'system',
 * });
 * ```
 */
export function createSemanticContextProcessor(
  defaultConfig?: SemanticContextConfig,
): InputProcessor<SemanticContextConfig> {
  return {
    id: "semantic-context",
    name: "Semantic Context Search",
    description: "Retrieves relevant context using semantic similarity search",
    priority: 95, // After memory retrieval

    async process(
      data: InputProcessorData,
      config?: SemanticContextConfig,
    ): Promise<ProcessorResult<InputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        // topK will be used in actual vector store search implementation
        topK: _topK = 5,
        minScore = 0.7,
        contextFormat = "system",
        namespace,
      } = mergedConfig;

      if (!data.text) {
        return {
          action: "continue",
          data,
          metadata: {
            semanticContextSkipped: true,
            reason: "no_text_input",
          },
        };
      }

      try {
        // Search for relevant context
        const results = await searchSemanticContext(data.text, mergedConfig);

        if (results.length === 0) {
          return {
            action: "continue",
            data,
            metadata: {
              semanticContextFound: false,
              searchedNamespace: namespace,
            },
          };
        }

        // Filter by minimum score
        const relevantResults = results.filter((r) => r.score >= minScore);

        if (relevantResults.length === 0) {
          return {
            action: "continue",
            data,
            metadata: {
              semanticContextFound: false,
              resultsFiltered: results.length,
              minScoreThreshold: minScore,
            },
          };
        }

        // Format context based on configuration
        const contextText = formatContextResults(relevantResults);

        const enrichedData = { ...data };

        if (contextFormat === "system" || contextFormat === "both") {
          enrichedData.systemPrompt = data.systemPrompt
            ? `${data.systemPrompt}\n\nRelevant Context:\n${contextText}`
            : `Relevant Context:\n${contextText}`;
        }

        if (contextFormat === "user" || contextFormat === "both") {
          enrichedData.messages = [
            {
              id: `semantic-context-${Date.now()}`,
              role: "user" as const,
              content: `Context: ${contextText}`,
            },
            ...data.messages,
          ];
        }

        // Calculate average score for metadata
        const avgScore =
          relevantResults.reduce((sum, r) => sum + r.score, 0) /
          relevantResults.length;

        return {
          action: "continue",
          data: enrichedData,
          metadata: {
            semanticContextFound: true,
            contextResultsCount: relevantResults.length,
            avgScore: parseFloat(avgScore.toFixed(4)),
            contextFormat,
            searchedNamespace: namespace,
          },
        };
      } catch (error) {
        // Don't block on semantic search failure
        return {
          action: "continue",
          data,
          issues: [
            {
              category: "semantic_search",
              severity: "warning",
              message: `Semantic search failed: ${error instanceof Error ? error.message : String(error)}`,
              context: namespace ? { namespace } : undefined,
            },
          ],
          metadata: {
            semanticSearchFailed: true,
            errorMessage:
              error instanceof Error ? error.message : String(error),
          },
        };
      }
    },

    validateConfig(config: SemanticContextConfig): {
      valid: boolean;
      errors: string[];
    } {
      const errors: string[] = [];

      if (config.topK !== undefined && config.topK < 1) {
        errors.push("topK must be at least 1");
      }

      if (
        config.minScore !== undefined &&
        (config.minScore < 0 || config.minScore > 1)
      ) {
        errors.push("minScore must be between 0 and 1");
      }

      if (
        config.vectorStore &&
        !["pinecone", "weaviate", "chromadb", "custom"].includes(
          config.vectorStore,
        )
      ) {
        errors.push(
          `Invalid vectorStore: ${config.vectorStore}. Must be 'pinecone', 'weaviate', 'chromadb', or 'custom'`,
        );
      }

      if (
        config.contextFormat &&
        !["system", "user", "both"].includes(config.contextFormat)
      ) {
        errors.push(
          `Invalid contextFormat: ${config.contextFormat}. Must be 'system', 'user', or 'both'`,
        );
      }

      return { valid: errors.length === 0, errors };
    },
  };
}

/**
 * Search result from semantic search
 */
type SearchResult = {
  /** Text content of the result */
  text: string;
  /** Similarity score (0-1) */
  score: number;
  /** Optional metadata associated with the result */
  metadata?: Record<string, unknown>;
};

/**
 * Search for semantically similar context
 *
 * This is a placeholder implementation. In production, this would
 * integrate with vector stores like Pinecone, Weaviate, or ChromaDB.
 *
 * @param query - The query text to search for
 * @param config - Search configuration
 * @returns Array of search results with scores
 */
async function searchSemanticContext(
  _query: string,
  _config: SemanticContextConfig,
): Promise<SearchResult[]> {
  // This is a placeholder implementation
  // In production, this would integrate with vector stores:
  //
  // if (config.vectorStore === 'pinecone') {
  //   const pinecone = getPineconeClient();
  //   const index = pinecone.Index(config.namespace || 'default');
  //   const embedding = config.embedFunction
  //     ? await config.embedFunction(query)
  //     : await defaultEmbedding(query);
  //   const results = await index.query({
  //     vector: embedding,
  //     topK: config.topK || 5,
  //     includeMetadata: true,
  //   });
  //   return results.matches.map(m => ({
  //     text: m.metadata?.text as string || '',
  //     score: m.score || 0,
  //     metadata: m.metadata,
  //   }));
  // }

  // For now, return empty array as this requires vector store integration
  return [];
}

/**
 * Format search results into context text
 *
 * @param results - Search results to format
 * @returns Formatted context string
 */
function formatContextResults(results: SearchResult[]): string {
  return results.map((r, i) => `[${i + 1}] ${r.text}`).join("\n\n");
}

/**
 * Pre-configured semantic context processor with default settings
 */
export const semanticContextProcessor = createSemanticContextProcessor();
