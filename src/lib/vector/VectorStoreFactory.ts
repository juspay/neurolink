/**
 * Vector Store Factory
 * Factory pattern for creating vector store instances with dynamic registration
 */

import { BaseFactory } from "../core/infrastructure/baseFactory.js";
import type { BaseVectorStore } from "./BaseVectorStore.js";
import type { VectorStoreConfig, VectorStoreName } from "./types.js";

/**
 * Factory for creating vector store instances
 * Follows NeuroLink's BaseFactory pattern with dynamic imports
 */
class VectorStoreFactoryImpl extends BaseFactory<
  BaseVectorStore,
  VectorStoreConfig
> {
  private static instance: VectorStoreFactoryImpl | null = null;

  private constructor() {
    super();
  }

  static getInstance(): VectorStoreFactoryImpl {
    if (!VectorStoreFactoryImpl.instance) {
      VectorStoreFactoryImpl.instance = new VectorStoreFactoryImpl();
    }
    return VectorStoreFactoryImpl.instance;
  }

  /**
   * Register all vector store adapters
   * Uses dynamic imports to avoid circular dependencies
   */
  protected async registerAll(): Promise<void> {
    // SQLite-VSS (Embedded)
    this.register(
      "sqlite-vss",
      async (config) => {
        const { SQLiteVSSAdapter } = await import(
          "./adapters/SQLiteVSSAdapter.js"
        );
        // Ensure required SQLiteVSSConfig properties
        const sqliteConfig = {
          databasePath: ":memory:",
          inMemory: true,
          ...config,
        };
        return new SQLiteVSSAdapter(sqliteConfig);
      },
      ["sqlite", "sqlite-vss", "sqlitevss", "vss"],
      {
        category: "embedded",
        description: "SQLite with VSS extension for vector similarity search",
      },
    );

    // LibSQL/Turso (Embedded with Cloud Sync)
    this.register(
      "libsql",
      async (config) => {
        const { LibSQLAdapter } = await import("./adapters/LibSQLAdapter.js");
        // Ensure required LibSQLConfig properties
        if (!config?.mode) {
          throw new Error(
            "LibSQL requires 'mode' in configuration (local, remote, or replica)",
          );
        }
        return new LibSQLAdapter(
          config as import("./adapters/LibSQLAdapter.js").LibSQLConfig,
        );
      },
      ["libsql", "turso", "turso-db", "libsql-turso"],
      {
        category: "embedded",
        description:
          "LibSQL/Turso for embedded vector search with optional cloud sync",
      },
    );

    // DuckDB (Embedded Analytical)
    this.register(
      "duckdb",
      async (config) => {
        const { DuckDBAdapter } = await import(
          "./adapters/DuckDBAdapter.js"
        );
        // Ensure required DuckDBConfig properties
        const duckdbConfig = {
          databasePath: ":memory:",
          inMemory: true,
          ...config,
        };
        return new DuckDBAdapter(duckdbConfig);
      },
      ["duckdb", "duck", "duckdb-vss"],
      {
        category: "embedded",
        description: "DuckDB with VSS extension for analytical vector search",
      },
    );

    // Cloudflare Vectorize (Cloud-Native)
    this.register(
      "cloudflare",
      async (config) => {
        const { CloudflareVectorizeAdapter } = await import(
          "./adapters/CloudflareVectorizeAdapter.js"
        );
        // Ensure required CloudflareVectorizeConfig properties
        const cloudflareConfig = {
          accountId: config?.accountId || "",
          apiToken: config?.apiToken || "",
          ...config,
        };
        return new CloudflareVectorizeAdapter(cloudflareConfig);
      },
      ["cloudflare", "cloudflare-vectorize", "vectorize", "cf-vectorize"],
      {
        category: "cloud-native",
        description: "Cloudflare Vectorize for globally distributed vector search",
      },
    );

    // MongoDB Atlas Vector Search (Database)
    this.register(
      "mongodb",
      async (config) => {
        const { MongoDBAtlasAdapter } = await import(
          "./adapters/MongoDBAtlasAdapter.js"
        );
        // Ensure required MongoDBAtlasConfig properties
        const mongoConfig = {
          connectionUri: config?.connectionUri || "",
          databaseName: config?.databaseName || "vectors",
          ...config,
        };
        return new MongoDBAtlasAdapter(mongoConfig);
      },
      ["mongodb", "mongodb-atlas", "mongo", "atlas", "mongo-atlas"],
      {
        category: "database",
        description: "MongoDB Atlas with native $vectorSearch for vector similarity",
      },
    );

    // OpenSearch (Enterprise Search)
    this.register(
      "opensearch",
      async (config) => {
        const { OpenSearchAdapter } = await import(
          "./adapters/OpenSearchAdapter.js"
        );
        // Ensure required OpenSearchConfig properties
        const opensearchConfig = {
          node: config?.node || "https://localhost:9200",
          ...config,
        };
        return new OpenSearchAdapter(opensearchConfig);
      },
      ["opensearch", "opensearch-knn", "aws-opensearch", "aoss"],
      {
        category: "enterprise",
        description: "OpenSearch with k-NN plugin for enterprise vector search",
      },
    );

    // Azure AI Search (Enterprise)
    this.register(
      "azure-ai-search",
      async (config) => {
        const { AzureAISearchAdapter } = await import(
          "./adapters/AzureAISearchAdapter.js"
        );
        // Ensure required AzureAISearchConfig properties
        if (!config?.endpoint || !config?.apiKey) {
          throw new Error(
            "Azure AI Search requires 'endpoint' and 'apiKey' in configuration",
          );
        }
        return new AzureAISearchAdapter(config as import("./adapters/AzureAISearchAdapter.js").AzureAISearchConfig);
      },
      ["azure-ai-search", "azure-search", "cognitive-search", "azure"],
      {
        category: "enterprise",
        description: "Azure AI Search (formerly Cognitive Search) for enterprise vector search",
      },
    );

    // Milvus (Self-Hosted / Local)
    this.register(
      "milvus",
      async (config) => {
        const { MilvusAdapter } = await import("./adapters/MilvusAdapter.js");
        // Ensure required MilvusConfig properties
        const milvusConfig = {
          address: config?.address || "localhost:19530",
          ...config,
        };
        return new MilvusAdapter(milvusConfig);
      },
      ["milvus", "milvus-local"],
      {
        category: "cloud-native",
        description:
          "Milvus for high-performance self-hosted vector similarity search",
      },
    );

    // Zilliz Cloud (Managed Milvus Service)
    this.register(
      "zilliz",
      async (config) => {
        const { ZillizAdapter } = await import("./adapters/ZillizAdapter.js");
        // Ensure required ZillizConfig properties
        if (!config?.uri || !config?.token) {
          throw new Error(
            "Zilliz Cloud requires 'uri' and 'token' in configuration",
          );
        }
        return new ZillizAdapter(
          config as import("./adapters/ZillizAdapter.js").ZillizConfig,
        );
      },
      ["zilliz", "zilliz-cloud", "zilliz-serverless"],
      {
        category: "cloud-native",
        description:
          "Zilliz Cloud - fully managed Milvus with serverless and dedicated clusters",
      },
    );

    // Vertex AI Vector Search (Enterprise)
    this.register(
      "vertex-vector",
      async (config) => {
        const { VertexVectorSearchAdapter } = await import(
          "./adapters/VertexVectorSearchAdapter.js"
        );
        // Ensure required VertexVectorSearchConfig properties
        if (!config?.projectId || !config?.location) {
          throw new Error(
            "Vertex AI Vector Search requires 'projectId' and 'location' in configuration",
          );
        }
        return new VertexVectorSearchAdapter(
          config as import("./adapters/VertexVectorSearchAdapter.js").VertexVectorSearchConfig,
        );
      },
      ["vertex-vector", "vertex-ai-vector", "vertex-vector-search", "matching-engine", "vertex"],
      {
        category: "enterprise",
        description:
          "Google Vertex AI Vector Search (Matching Engine) for enterprise-scale vector search",
      },
    );

    // Elasticsearch (Enterprise Search)
    this.register(
      "elasticsearch",
      async (config) => {
        const { ElasticsearchAdapter } = await import(
          "./adapters/ElasticsearchAdapter.js"
        );
        // Ensure required ElasticsearchConfig properties
        const esConfig = {
          node: config?.node || "http://localhost:9200",
          ...config,
        };
        return new ElasticsearchAdapter(esConfig);
      },
      ["elasticsearch", "elastic", "es", "elastic-search", "elasticcloud"],
      {
        category: "enterprise",
        description: "Elasticsearch with dense_vector and kNN search for enterprise vector search",
      },
    );

    // Upstash Vector (Cloud-Native Serverless)
    this.register(
      "upstash",
      async (config) => {
        const { UpstashVectorAdapter } = await import(
          "./adapters/UpstashVectorAdapter.js"
        );
        // Ensure required UpstashVectorConfig properties
        if (!config?.url || !config?.token) {
          throw new Error(
            "Upstash Vector requires 'url' and 'token' in configuration",
          );
        }
        return new UpstashVectorAdapter(
          config as import("./adapters/UpstashVectorAdapter.js").UpstashVectorConfig,
        );
      },
      ["upstash", "upstash-vector", "upstash-serverless"],
      {
        category: "cloud-native",
        description:
          "Upstash Vector - REST-based serverless vector database with namespace support",
      },
    );

    // LanceDB (Embedded with Cloud Storage Support)
    this.register(
      "lance",
      async (config) => {
        const { LanceDBAdapter } = await import(
          "./adapters/LanceDBAdapter.js"
        );
        // Ensure required LanceDBConfig properties
        const lanceConfig = {
          uri: config?.uri || "./data/lancedb",
          ...config,
        };
        return new LanceDBAdapter(lanceConfig);
      },
      ["lance", "lancedb", "lance-db", "lancedb-embedded"],
      {
        category: "embedded",
        description:
          "LanceDB - embedded vector database with Arrow columnar format and S3/Azure/GCS support",
      },
    );

    // DataStax Astra DB (Cloud-Native Serverless)
    this.register(
      "astra",
      async (config) => {
        const { AstraDBAdapter } = await import("./adapters/AstraDBAdapter.js");
        // Ensure required AstraDBConfig properties
        if (!config?.token || !config?.endpoint) {
          throw new Error(
            "Astra DB requires 'token' and 'endpoint' in configuration",
          );
        }
        return new AstraDBAdapter(
          config as import("./adapters/AstraDBAdapter.js").AstraDBConfig,
        );
      },
      ["astra", "astra-db", "astradb", "datastax", "datastax-astra"],
      {
        category: "cloud-native",
        description:
          "DataStax Astra DB - serverless Cassandra with vector search",
      },
    );

    // Weaviate (Cloud-Native / Self-Hosted)
    this.register(
      "weaviate",
      async (config) => {
        const { WeaviateAdapter } = await import(
          "./adapters/WeaviateAdapter.js"
        );
        // Ensure required WeaviateConfig properties
        const weaviateConfig: import("./adapters/WeaviateAdapter.js").WeaviateConfig = {
          host: (config?.host as string) || "http://localhost:8080",
          ...config,
        };
        return new WeaviateAdapter(weaviateConfig);
      },
      ["weaviate", "weaviate-cloud", "wcs"],
      {
        category: "cloud-native",
        description:
          "Weaviate open-source vector database with hybrid search and GraphQL API",
      },
    );


    // Couchbase (Enterprise Database)
    this.register(
      "couchbase",
      async (config) => {
        const { CouchbaseAdapter } = await import(
          "./adapters/CouchbaseAdapter.js"
        );
        // Ensure required CouchbaseConfig properties
        if (!config?.connectionString || !config?.username || !config?.password || !config?.bucketName) {
          throw new Error(
            "Couchbase requires 'connectionString', 'username', 'password', and 'bucketName' in configuration",
          );
        }
        return new CouchbaseAdapter(
          config as import("./adapters/CouchbaseAdapter.js").CouchbaseConfig,
        );
      },
      ["couchbase", "couchbase-vector", "couchbase-fts", "cb"],
      {
        category: "enterprise",
        description:
          "Couchbase Vector Search via FTS service for hybrid search with JSON documents",
      },
    );

    // Redis Vector Store (Database)
    this.register(
      "redis",
      async (config) => {
        const { RedisVectorAdapter } = await import(
          "./adapters/RedisVectorAdapter.js"
        );
        // Ensure required RedisVectorConfig properties
        const redisConfig = {
          host: config?.host || "localhost",
          port: config?.port || 6379,
          ...config,
        };
        return new RedisVectorAdapter(redisConfig);
      },
      ["redis", "redis-vector", "redisvector", "redis-stack", "redisearch"],
      {
        category: "database",
        description: "Redis with RediSearch module for vector similarity search",
      },
    );


    // Chroma (Embedded)
    this.register(
      "chroma",
      async (config) => {
        const { ChromaAdapter } = await import("./adapters/ChromaAdapter.js");
        const chromaConfig = {
          path: config?.path || "./chroma-data",
          ephemeral: config?.ephemeral ?? (!config?.path && !config?.url),
          ...config,
        };
        return new ChromaAdapter(chromaConfig);
      },
      ["chroma", "chromadb", "chroma-db"],
      {
        category: "embedded",
        description: "Chroma embedded vector database with simple API and rich filtering",
      },
    );

    // pgvector (PostgreSQL Database)
    this.register(
      "pgvector",
      async (config) => {
        const { PgvectorAdapter } = await import(
          "./adapters/PgvectorAdapter.js"
        );
        // Ensure required PgvectorConfig properties with defaults
        const pgConfig: import("./adapters/PgvectorAdapter.js").PgvectorConfig = {
          host: (config?.host as string) || "localhost",
          port: (config?.port as number) || 5432,
          database: (config?.database as string) || "vectors",
          schema: (config?.schema as string) || "public",
          poolSize: (config?.poolSize as number) || 10,
          ...config,
        };
        return new PgvectorAdapter(pgConfig);
      },
      ["pgvector", "postgres", "postgresql", "pg"],
      {
        category: "database",
        description:
          "PostgreSQL with pgvector extension for vector similarity search with IVFFlat and HNSW indexes",
      },
    );

    // Qdrant (Cloud-Native)
    this.register(
      "qdrant",
      async (config) => {
        const { QdrantAdapter } = await import("./adapters/QdrantAdapter.js");
        // Ensure required QdrantConfig properties
        const qdrantConfig = {
          url: config?.url || "http://localhost:6333",
          ...config,
        };
        return new QdrantAdapter(qdrantConfig);
      },
      ["qdrant", "qdrant-cloud", "qdrant-local"],
      {
        category: "cloud-native",
        description:
          "Qdrant cloud-native vector database with rich filtering and quantization support",
      },
    );

    // Faiss (Embedded - High Performance)
    this.register(
      "faiss",
      async (config) => {
        const { FaissAdapter } = await import("./adapters/FaissAdapter.js");
        type FaissConfig = import("./adapters/FaissAdapter.js").FaissConfig;
        const faissConfig: FaissConfig = {
          indexPath: (config?.indexPath as string) || "./faiss-data",
          indexType: (config?.indexType as FaissConfig["indexType"]) || "flat",
          metricType: (config?.metricType as FaissConfig["metricType"]) || "L2",
          ...config,
        };
        return new FaissAdapter(faissConfig);
      },
      ["faiss", "faiss-local", "faiss-cpu", "facebook-faiss"],
      {
        category: "embedded",
        description:
          "Facebook AI Similarity Search for high-performance local vector search",
      },
    );

    // Pinecone (Cloud-Native)
    this.register(
      "pinecone",
      async (config) => {
        const { PineconeAdapter } = await import("./adapters/PineconeAdapter.js");
        // Ensure required PineconeConfig properties
        if (!config?.apiKey) {
          throw new Error(
            "Pinecone requires 'apiKey' in configuration",
          );
        }
        return new PineconeAdapter(
          config as import("./adapters/PineconeAdapter.js").PineconeConfig,
        );
      },
      ["pinecone", "pinecone-cloud", "pinecone-serverless"],
      {
        category: "cloud-native",
        description: "Pinecone cloud-native vector database with serverless and pod-based indexes",
      },
    );
  }

  /**
   * Create a vector store instance by name
   */
  async createStore(
    name: VectorStoreName | string,
    config: VectorStoreConfig,
  ): Promise<BaseVectorStore> {
    return this.create(name, config);
  }

  /**
   * Get list of available vector stores
   */
  getAvailableStores(): string[] {
    return this.getAvailable();
  }

  /**
   * Check if a store type is available
   */
  isStoreAvailable(name: string): boolean {
    return this.has(name);
  }

  /**
   * Reset factory for testing
   */
  reset(): void {
    this.clear();
    VectorStoreFactoryImpl.instance = null;
  }
}

// Export singleton instance
export const VectorStoreFactory = VectorStoreFactoryImpl.getInstance();

// Export class for testing
export { VectorStoreFactoryImpl };
