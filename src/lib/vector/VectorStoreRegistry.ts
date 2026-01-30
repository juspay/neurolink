/**
 * Vector Store Registry
 * Registry for tracking available vector stores with metadata
 */

import { BaseRegistry } from "../core/infrastructure/baseRegistry.js";
import type { BaseVectorStore } from "./BaseVectorStore.js";
import type { VectorStoreMetadata, VectorStoreName } from "./types.js";

/**
 * Registry for vector store implementations
 * Provides metadata about available stores and lazy instantiation
 */
class VectorStoreRegistryImpl extends BaseRegistry<
  BaseVectorStore,
  VectorStoreMetadata
> {
  private static instance: VectorStoreRegistryImpl | null = null;

  private constructor() {
    super();
  }

  static getInstance(): VectorStoreRegistryImpl {
    if (!VectorStoreRegistryImpl.instance) {
      VectorStoreRegistryImpl.instance = new VectorStoreRegistryImpl();
    }
    return VectorStoreRegistryImpl.instance;
  }

  /**
   * Register all vector store implementations with metadata
   */
  protected async registerAll(): Promise<void> {
    // SQLite-VSS (Embedded)
    this.register(
      "sqlite-vss",
      async () => {
        const { SQLiteVSSAdapter } = await import(
          "./adapters/SQLiteVSSAdapter.js"
        );
        return new SQLiteVSSAdapter({
          databasePath: ":memory:",
          inMemory: true,
        });
      },
      {
        category: "embedded",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "SQLite with VSS extension for lightweight embedded vector search",
      },
    );

    // LibSQL/Turso (Embedded with Cloud Sync)
    this.register(
      "libsql",
      async () => {
        const { LibSQLAdapter } = await import("./adapters/LibSQLAdapter.js");
        // Note: Real usage would provide mode and appropriate config
        return new LibSQLAdapter({
          mode: "local",
          databasePath: ":memory:",
        });
      },
      {
        category: "embedded",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "LibSQL/Turso for embedded vector search with optional Turso cloud sync (supports local, remote, and replica modes)",
      },
    );

    // Cloudflare Vectorize (Cloud-Native)
    this.register(
      "cloudflare",
      async () => {
        const { CloudflareVectorizeAdapter } = await import(
          "./adapters/CloudflareVectorizeAdapter.js"
        );
        // Note: Real usage would provide accountId and apiToken
        return new CloudflareVectorizeAdapter({
          accountId: "",
          apiToken: "",
        });
      },
      {
        category: "cloud-native",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "Cloudflare Vectorize for globally distributed vector search with edge deployment",
      },
    );

    // MongoDB Atlas Vector Search (Database)
    this.register(
      "mongodb",
      async () => {
        const { MongoDBAtlasAdapter } = await import(
          "./adapters/MongoDBAtlasAdapter.js"
        );
        // Note: Real usage would provide connectionUri and databaseName
        return new MongoDBAtlasAdapter({
          connectionUri: "",
          databaseName: "vectors",
        });
      },
      {
        category: "database",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "MongoDB Atlas with native $vectorSearch aggregation for scalable vector similarity",
      },
    );

    // OpenSearch (Enterprise)
    this.register(
      "opensearch",
      async () => {
        const { OpenSearchAdapter } = await import(
          "./adapters/OpenSearchAdapter.js"
        );
        // Note: Real usage would provide node URL and auth
        return new OpenSearchAdapter({
          node: "https://localhost:9200",
        });
      },
      {
        category: "enterprise",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "OpenSearch with k-NN plugin for enterprise vector search with multiple engine support (nmslib, faiss, lucene)",
      },
    );

    // Azure AI Search (Enterprise)
    this.register(
      "azure-ai-search",
      async () => {
        const { AzureAISearchAdapter } = await import(
          "./adapters/AzureAISearchAdapter.js"
        );
        // Note: Real usage would provide endpoint and apiKey
        return new AzureAISearchAdapter({
          endpoint: "",
          apiKey: "",
        });
      },
      {
        category: "enterprise",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "Azure AI Search (formerly Cognitive Search) for enterprise vector search with hybrid search and semantic ranking",
      },
    );

    // Milvus (Self-Hosted)
    this.register(
      "milvus",
      async () => {
        const { MilvusAdapter } = await import("./adapters/MilvusAdapter.js");
        // Note: Real usage would provide address and credentials
        return new MilvusAdapter({
          address: "localhost:19530",
        });
      },
      {
        category: "cloud-native",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "Milvus for high-performance self-hosted vector similarity search with multiple index types (HNSW, IVF_FLAT, etc.)",
      },
    );

    // Zilliz Cloud (Managed Milvus)
    this.register(
      "zilliz",
      async () => {
        const { ZillizAdapter } = await import("./adapters/ZillizAdapter.js");
        // Note: Real usage would provide uri and token
        return new ZillizAdapter({
          uri: "",
          token: "",
        });
      },
      {
        category: "cloud-native",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "Zilliz Cloud - fully managed Milvus with serverless and dedicated clusters, auto-scaling, and enterprise features",
      },
    );

    // Vertex AI Vector Search (Enterprise)
    this.register(
      "vertex-vector",
      async () => {
        const { VertexVectorSearchAdapter } = await import(
          "./adapters/VertexVectorSearchAdapter.js"
        );
        // Note: Real usage would provide projectId, location, and indexEndpointId
        return new VertexVectorSearchAdapter({
          projectId: "",
          location: "us-central1",
        });
      },
      {
        category: "enterprise",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "Google Vertex AI Vector Search (Matching Engine) for enterprise-scale ANN search with streaming updates",
      },
    );

    // Upstash Vector (Cloud-Native Serverless)
    this.register(
      "upstash",
      async () => {
        const { UpstashVectorAdapter } = await import(
          "./adapters/UpstashVectorAdapter.js"
        );
        // Note: Real usage would provide url and token
        return new UpstashVectorAdapter({
          url: "",
          token: "",
        });
      },
      {
        category: "cloud-native",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "Upstash Vector - REST-based serverless vector database with namespace support and built-in embedding",
      },
    );

    // LanceDB (Embedded with Cloud Storage)
    this.register(
      "lance",
      async () => {
        const { LanceDBAdapter } = await import(
          "./adapters/LanceDBAdapter.js"
        );
        // Note: Real usage would provide uri (local path or cloud storage URL)
        return new LanceDBAdapter({
          uri: "./data/lancedb",
        });
      },
      {
        category: "embedded",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "LanceDB - embedded vector database with Arrow columnar format, local file or cloud storage (S3/Azure/GCS) support",
      },
    );

    // Elasticsearch (Enterprise)
    this.register(
      "elasticsearch",
      async () => {
        const { ElasticsearchAdapter } = await import(
          "./adapters/ElasticsearchAdapter.js"
        );
        // Note: Real usage would provide node URL and auth
        return new ElasticsearchAdapter({
          node: "http://localhost:9200",
        });
      },
      {
        category: "enterprise",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "Elasticsearch with dense_vector field type and kNN search for enterprise vector search with HNSW indexing",
      },
    );

    // Weaviate (Cloud-Native / Self-Hosted)
    this.register(
      "weaviate",
      async () => {
        const { WeaviateAdapter } = await import(
          "./adapters/WeaviateAdapter.js"
        );
        // Note: Real usage would provide host and optional apiKey
        return new WeaviateAdapter({
          host: "http://localhost:8080",
        });
      },
      {
        category: "cloud-native",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "Weaviate open-source vector database with hybrid search (vector + BM25), GraphQL API, and multi-tenancy support",
      },
    );

    // Redis Vector Store (Database)
    this.register(
      "redis",
      async () => {
        const { RedisVectorAdapter } = await import(
          "./adapters/RedisVectorAdapter.js"
        );
        // Note: Real usage would provide host, port, and optional auth
        return new RedisVectorAdapter({
          host: "localhost",
          port: 6379,
        });
      },
      {
        category: "database",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "Redis with RediSearch module for vector similarity search with FLAT and HNSW index algorithms",
      },
    );

    // Chroma (Embedded)
    this.register(
      "chroma",
      async () => {
        const { ChromaAdapter } = await import("./adapters/ChromaAdapter.js");
        // Note: Real usage would provide path or url for persistent/HTTP mode
        return new ChromaAdapter({
          ephemeral: true, // In-memory mode for default
        });
      },
      {
        category: "embedded",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "Chroma open-source embedding database with in-memory, persistent, and HTTP client modes, rich metadata filtering ($eq, $ne, $gt, $gte, $lt, $lte, $in, $nin), and document-level filtering",
      },
    );

    // pgvector (PostgreSQL)
    this.register(
      "pgvector",
      async () => {
        const { PgvectorAdapter } = await import(
          "./adapters/PgvectorAdapter.js"
        );
        // Note: Real usage would provide connection string or host/port/user/password
        return new PgvectorAdapter({
          host: "localhost",
          port: 5432,
          database: "vectors",
        });
      },
      {
        category: "database",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "PostgreSQL with pgvector extension for vector similarity search with IVFFlat and HNSW index support",
      },
    );

    // Qdrant (Cloud-Native / Self-Hosted)
    this.register(
      "qdrant",
      async () => {
        const { QdrantAdapter } = await import("./adapters/QdrantAdapter.js");
        // Note: Real usage would provide url and optional apiKey
        return new QdrantAdapter({
          url: "http://localhost:6333",
        });
      },
      {
        category: "cloud-native",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "Qdrant cloud-native vector database with rich must/should/must_not filtering, scalar and binary quantization, named vectors, and shard key routing for multi-tenancy",
      },
    );

    // Faiss (Embedded - High Performance)
    this.register(
      "faiss",
      async () => {
        const { FaissAdapter } = await import("./adapters/FaissAdapter.js");
        // Note: Real usage would provide indexPath and other options
        return new FaissAdapter({
          indexPath: "./faiss-data",
          indexType: "flat",
          metricType: "L2",
        });
      },
      {
        category: "embedded",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "Facebook AI Similarity Search for high-performance local vector search with multiple index types (Flat, IVF, HNSW, IVF-PQ) and file-based persistence",
      },
    );

    // Pinecone (Cloud-Native)
    this.register(
      "pinecone",
      async () => {
        const { PineconeAdapter } = await import(
          "./adapters/PineconeAdapter.js"
        );
        // Note: Real usage would provide apiKey
        return new PineconeAdapter({
          apiKey: "",
        });
      },
      {
        category: "cloud-native",
        metrics: ["cosine", "euclidean", "dotProduct"],
        supportsNamespaces: true,
        supportsFiltering: true,
        description:
          "Pinecone cloud-native vector database with serverless and pod-based indexes, sparse vectors for hybrid search",
      },
    );
  }

  /**
   * Get store by name with type safety
   */
  async getStore(name: VectorStoreName | string): Promise<BaseVectorStore | undefined> {
    return this.get(name);
  }

  /**
   * List all available stores with metadata
   */
  listStores(): Array<{ id: string; metadata: VectorStoreMetadata }> {
    return this.list();
  }

  /**
   * Get stores by category
   */
  getStoresByCategory(
    category: VectorStoreMetadata["category"],
  ): Array<{ id: string; metadata: VectorStoreMetadata }> {
    return this.list().filter((store) => store.metadata.category === category);
  }

  /**
   * Get stores that support a specific metric
   */
  getStoresByMetric(
    metric: "cosine" | "euclidean" | "dotProduct",
  ): Array<{ id: string; metadata: VectorStoreMetadata }> {
    return this.list().filter((store) =>
      store.metadata.metrics.includes(metric),
    );
  }

  /**
   * Reset registry for testing
   */
  reset(): void {
    this.clear();
    VectorStoreRegistryImpl.instance = null;
  }
}

// Export singleton instance
export const VectorStoreRegistry = VectorStoreRegistryImpl.getInstance();

// Export class for testing
export { VectorStoreRegistryImpl };
