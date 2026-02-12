/**
 * Graph RAG Implementation
 *
 * Knowledge graph-based retrieval augmented generation.
 * Creates semantic relationships between document chunks and uses
 * random walk with restart for context-aware retrieval.
 */

import { randomUUID } from "crypto";
import type {
  GraphNode,
  GraphEdge,
  GraphChunk,
  GraphEmbedding,
  RankedNode,
  GraphRAGConfig,
  GraphQueryParams,
  GraphStats,
} from "../types.js";
import { logger } from "../../utils/logger.js";

/**
 * Graph-based Retrieval Augmented Generation
 *
 * Creates a knowledge graph from document chunks where nodes represent
 * documents and edges represent semantic relationships based on
 * embedding similarity.
 */
export class GraphRAG {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge[]> = new Map();
  private dimension: number;
  private threshold: number;

  constructor(config?: GraphRAGConfig) {
    this.dimension = config?.dimension ?? 1536;
    this.threshold = config?.threshold ?? 0.7;
  }

  /**
   * Create a knowledge graph from document chunks and embeddings
   *
   * @param chunks - Array of document chunks
   * @param embeddings - Corresponding embedding vectors
   */
  createGraph(chunks: GraphChunk[], embeddings: GraphEmbedding[]): void {
    if (chunks.length !== embeddings.length) {
      throw new Error("Chunks and embeddings arrays must have the same length");
    }

    // Clear existing graph
    this.nodes.clear();
    this.edges.clear();

    // Create nodes
    const nodeIds: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const id = randomUUID();
      nodeIds.push(id);

      this.nodes.set(id, {
        id,
        content: chunks[i].text,
        metadata: chunks[i].metadata || {},
        embedding: embeddings[i].vector,
      });
    }

    // Create edges based on semantic similarity
    for (let i = 0; i < nodeIds.length; i++) {
      const edges: GraphEdge[] = [];
      const nodeA = this.nodes.get(nodeIds[i]);
      if (!nodeA?.embedding) {
        continue;
      }

      for (let j = 0; j < nodeIds.length; j++) {
        if (i === j) {
          continue;
        }

        const nodeB = this.nodes.get(nodeIds[j]);
        if (!nodeB?.embedding) {
          continue;
        }
        const similarity = this.cosineSimilarity(
          nodeA.embedding,
          nodeB.embedding,
        );

        if (similarity >= this.threshold) {
          edges.push({
            source: nodeIds[i],
            target: nodeIds[j],
            weight: similarity,
            type: "semantic",
          });
        }
      }

      // Sort edges by weight descending
      edges.sort((a, b) => b.weight - a.weight);
      this.edges.set(nodeIds[i], edges);
    }

    logger.info("[GraphRAG] Graph created", {
      nodes: this.nodes.size,
      totalEdges: Array.from(this.edges.values()).reduce(
        (sum, e) => sum + e.length,
        0,
      ),
      threshold: this.threshold,
    });
  }

  /**
   * Query the graph using random walk with restart
   *
   * @param params - Query parameters including embedding vector
   * @returns Ranked nodes by relevance
   */
  query(params: GraphQueryParams): RankedNode[] {
    const {
      query,
      topK = 10,
      randomWalkSteps = 100,
      restartProb = 0.15,
    } = params;

    if (this.nodes.size === 0) {
      return [];
    }

    // Calculate initial similarities to query
    const similarities = new Map<string, number>();
    for (const [id, node] of this.nodes) {
      if (node.embedding) {
        similarities.set(id, this.cosineSimilarity(query, node.embedding));
      }
    }

    // Find starting nodes (most similar to query)
    const sortedNodes = Array.from(similarities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(5, this.nodes.size));

    if (sortedNodes.length === 0) {
      return [];
    }

    // Random walk with restart
    const visitCounts = new Map<string, number>();
    const startNodeIds = sortedNodes.map(([id]) => id);
    const startProbs = this.normalizeProbs(sortedNodes.map(([, sim]) => sim));

    for (let step = 0; step < randomWalkSteps; step++) {
      // Choose starting node based on query similarity
      const startIdx = this.weightedRandomChoice(startProbs);
      let currentNode = startNodeIds[startIdx];

      // Walk with restart probability
      if (Math.random() >= restartProb) {
        const edges = this.edges.get(currentNode) || [];
        if (edges.length > 0) {
          // Choose next node based on edge weights
          const edgeWeights = edges.map((e) => e.weight);
          const normalizedWeights = this.normalizeProbs(edgeWeights);
          const nextIdx = this.weightedRandomChoice(normalizedWeights);
          currentNode = edges[nextIdx].target;
        }
      }

      // Update visit count
      visitCounts.set(currentNode, (visitCounts.get(currentNode) || 0) + 1);
    }

    // Combine visit frequency with query similarity for final ranking
    const scores = new Map<string, number>();
    const maxVisits = Math.max(...visitCounts.values());

    for (const [id] of this.nodes) {
      const visitScore = (visitCounts.get(id) || 0) / maxVisits;
      const similarityScore = similarities.get(id) || 0;

      // Weighted combination
      scores.set(id, 0.6 * similarityScore + 0.4 * visitScore);
    }

    // Sort and return top K
    const rankedNodes = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .flatMap(([id, score]): RankedNode[] => {
        const node = this.nodes.get(id);
        if (!node) {
          return [];
        }
        return [
          {
            id,
            content: node.content,
            metadata: node.metadata,
            score,
          },
        ];
      });

    logger.debug("[GraphRAG] Query completed", {
      topK,
      resultsCount: rankedNodes.length,
      topScore: rankedNodes[0]?.score,
    });

    return rankedNodes;
  }

  /**
   * Add a single node to the graph
   *
   * @param chunk - Document chunk
   * @param embedding - Embedding vector
   * @returns Node ID
   */
  addNode(chunk: GraphChunk, embedding: GraphEmbedding): string {
    const id = randomUUID();

    this.nodes.set(id, {
      id,
      content: chunk.text,
      metadata: chunk.metadata || {},
      embedding: embedding.vector,
    });

    // Create edges to existing nodes
    const edges: GraphEdge[] = [];
    for (const [existingId, existingNode] of this.nodes) {
      if (existingId === id) {
        continue;
      }

      if (!existingNode.embedding) {
        continue;
      }
      const similarity = this.cosineSimilarity(
        embedding.vector,
        existingNode.embedding,
      );

      if (similarity >= this.threshold) {
        edges.push({
          source: id,
          target: existingId,
          weight: similarity,
          type: "semantic",
        });

        // Add reverse edge
        const existingEdges = this.edges.get(existingId) || [];
        existingEdges.push({
          source: existingId,
          target: id,
          weight: similarity,
          type: "semantic",
        });
        this.edges.set(existingId, existingEdges);
      }
    }

    this.edges.set(id, edges);

    return id;
  }

  /**
   * Remove a node and its edges from the graph
   *
   * @param id - Node ID to remove
   * @returns True if node was removed
   */
  removeNode(id: string): boolean {
    if (!this.nodes.has(id)) {
      return false;
    }

    // Remove node
    this.nodes.delete(id);
    this.edges.delete(id);

    // Remove edges pointing to this node
    for (const [nodeId, edges] of this.edges) {
      this.edges.set(
        nodeId,
        edges.filter((e) => e.target !== id),
      );
    }

    return true;
  }

  /**
   * Get graph statistics
   */
  getStats(): GraphStats {
    const edgeCount = Array.from(this.edges.values()).reduce(
      (sum, e) => sum + e.length,
      0,
    );

    return {
      nodeCount: this.nodes.size,
      edgeCount,
      avgDegree: this.nodes.size > 0 ? edgeCount / this.nodes.size : 0,
      threshold: this.threshold,
    };
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get edges for a node
   */
  getEdges(nodeId: string): GraphEdge[] {
    return this.edges.get(nodeId) || [];
  }

  /**
   * Find connected components in the graph
   */
  findConnectedComponents(): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const nodeId of this.nodes.keys()) {
      if (visited.has(nodeId)) {
        continue;
      }

      const component: string[] = [];
      const queue = [nodeId];

      while (queue.length > 0) {
        const current = queue.shift();
        if (current === undefined || visited.has(current)) {
          continue;
        }

        visited.add(current);
        component.push(current);

        const edges = this.edges.get(current) || [];
        for (const edge of edges) {
          if (!visited.has(edge.target)) {
            queue.push(edge.target);
          }
        }
      }

      components.push(component);
    }

    return components;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
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

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Normalize probabilities to sum to 1
   */
  private normalizeProbs(probs: number[]): number[] {
    const sum = probs.reduce((a, b) => a + b, 0);
    return sum === 0
      ? probs.map(() => 1 / probs.length)
      : probs.map((p) => p / sum);
  }

  /**
   * Weighted random choice
   */
  private weightedRandomChoice(weights: number[]): number {
    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return i;
      }
    }

    return weights.length - 1;
  }

  /**
   * Update similarity threshold and rebuild edges
   */
  updateThreshold(threshold: number): void {
    this.threshold = threshold;

    // Rebuild edges with new threshold
    this.edges.clear();

    const nodeIds = Array.from(this.nodes.keys());

    for (let i = 0; i < nodeIds.length; i++) {
      const edges: GraphEdge[] = [];
      const nodeA = this.nodes.get(nodeIds[i]);
      if (!nodeA?.embedding) {
        continue;
      }

      for (let j = 0; j < nodeIds.length; j++) {
        if (i === j) {
          continue;
        }

        const nodeB = this.nodes.get(nodeIds[j]);
        if (!nodeB?.embedding) {
          continue;
        }

        const similarity = this.cosineSimilarity(
          nodeA.embedding,
          nodeB.embedding,
        );

        if (similarity >= threshold) {
          edges.push({
            source: nodeIds[i],
            target: nodeIds[j],
            weight: similarity,
            type: "semantic",
          });
        }
      }

      edges.sort((a, b) => b.weight - a.weight);
      this.edges.set(nodeIds[i], edges);
    }
  }

  /**
   * Serialize graph to JSON
   */
  toJSON(): {
    nodes: GraphNode[];
    edges: Array<{ source: string; edges: GraphEdge[] }>;
    config: { dimension: number; threshold: number };
  } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.entries()).map(([source, edges]) => ({
        source,
        edges,
      })),
      config: {
        dimension: this.dimension,
        threshold: this.threshold,
      },
    };
  }

  /**
   * Load graph from JSON
   */
  static fromJSON(json: {
    nodes: GraphNode[];
    edges: Array<{ source: string; edges: GraphEdge[] }>;
    config: { dimension: number; threshold: number };
  }): GraphRAG {
    const graph = new GraphRAG({
      dimension: json.config.dimension,
      threshold: json.config.threshold,
    });

    for (const node of json.nodes) {
      graph.nodes.set(node.id, node);
    }

    for (const { source, edges } of json.edges) {
      graph.edges.set(source, edges);
    }

    return graph;
  }
}
