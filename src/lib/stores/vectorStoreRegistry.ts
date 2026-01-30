/**
 * Registry for all vector store implementations
 * Uses dynamic imports to avoid circular dependencies
 * Following NeuroLink's ProviderRegistry pattern
 */

import { VectorStoreName } from "../types/vectorTypes.js";
import { logger } from "../utils/logger.js";
// Import types only (these are erased at runtime, so no circular dependency issues)
import type { PineconeConfig } from "./cloud/pinecone.js";
import type { QdrantConfig } from "./cloud/qdrant.js";
import type { WeaviateConfig } from "./cloud/weaviate.js";
import type { UpstashConfig } from "./cloud/upstash.js";
import type { CloudflareVectorizeConfig } from "./cloud/cloudflareVectorize.js";
import type { AstraConfig } from "./cloud/datastaxAstra.js";
import type { ElasticsearchConfig } from "./database/elasticsearch.js";
import type { MongoDBConfig } from "./database/mongodb.js";
import type { OpenSearchConfig } from "./database/opensearch.js";
import type { PgvectorConfig } from "./database/pgvector.js";
import type { ChromaConfig } from "./embedded/chroma.js";
import type { DuckDBConfig } from "./embedded/duckdb.js";
import type { LanceConfig } from "./embedded/lance.js";
import type { LibSQLConfig } from "./embedded/libsql.js";
import type { MilvusConfig } from "./enterprise/milvus.js";
import type { ZillizConfig } from "./enterprise/zilliz.js";
import type { AzureAiSearchConfig } from "./enterprise/azureAiSearch.js";
import type { VertexVectorSearchConfig } from "./enterprise/vertexVectorSearch.js";
import type { AwsOpensearchConfig } from "./enterprise/awsOpensearch.js";
import type { CouchbaseConfig } from "./enterprise/couchbase.js";
import type { VespaConfig } from "./enterprise/vespa.js";
import type { MarqoConfig } from "./enterprise/marqo.js";
import { VectorStoreFactory } from "./vectorStoreFactory.js";

/**
 * Registry for all vector store implementations
 * Uses dynamic imports to avoid circular dependencies
 */
export class VectorStoreRegistry {
  private static registered = false;

  /**
   * Register all vector stores with the factory
   * Uses dynamic imports to prevent circular dependency issues
   */
  static async registerAllStores(): Promise<void> {
    if (VectorStoreRegistry.registered) {
      return;
    }

    try {
      // ========================================
      // Cloud-native stores (Tier 1 & 2)
      // ========================================

      // Pinecone - Market leader managed service
      VectorStoreFactory.registerStore(
        VectorStoreName.PINECONE,
        async (config) => {
          const { PineconeStore } = await import("./cloud/pinecone.js");
          return new PineconeStore(config as PineconeConfig);
        },
        ["pinecone"],
      );

      // Qdrant - High performance open source
      VectorStoreFactory.registerStore(
        VectorStoreName.QDRANT,
        async (config) => {
          const { QdrantStore } = await import("./cloud/qdrant.js");
          return new QdrantStore(config as QdrantConfig);
        },
        ["qdrant"],
      );

      // Weaviate - Open source with hybrid search
      VectorStoreFactory.registerStore(
        VectorStoreName.WEAVIATE,
        async (config) => {
          const { WeaviateStore } = await import("./cloud/weaviate.js");
          return new WeaviateStore(config as WeaviateConfig);
        },
        ["weaviate"],
      );

      // Upstash Vector - Serverless vector database with Redis-like simplicity
      VectorStoreFactory.registerStore(
        VectorStoreName.UPSTASH,
        async (config) => {
          const { UpstashStore } = await import("./cloud/upstash.js");
          return new UpstashStore(config as UpstashConfig);
        },
        ["upstash", "upstash-vector"],
      );

      // Cloudflare Vectorize - Edge-native vector database
      VectorStoreFactory.registerStore(
        VectorStoreName.CLOUDFLARE,
        async (config) => {
          const { CloudflareVectorizeStore } = await import(
            "./cloud/cloudflareVectorize.js"
          );
          return new CloudflareVectorizeStore(
            config as CloudflareVectorizeConfig,
          );
        },
        ["cloudflare", "cloudflare-vectorize", "vectorize"],
      );

      // DataStax Astra DB - Serverless Cassandra-based vector database
      VectorStoreFactory.registerStore(
        VectorStoreName.ASTRA,
        async (config) => {
          const { AstraStore } = await import("./cloud/datastaxAstra.js");
          return new AstraStore(config as AstraConfig);
        },
        ["astra", "datastax", "datastax-astra", "astra-db"],
      );

      // ========================================
      // Database extensions (Tier 1)
      // ========================================

      // pgvector - PostgreSQL extension (highest priority)
      VectorStoreFactory.registerStore(
        VectorStoreName.PGVECTOR,
        async (config) => {
          const { PgvectorStore } = await import("./database/pgvector.js");
          return new PgvectorStore(config as PgvectorConfig);
        },
        ["pgvector", "postgres", "postgresql", "pg"],
      );

      // MongoDB - MongoDB Atlas Vector Search
      VectorStoreFactory.registerStore(
        VectorStoreName.MONGODB,
        async (config) => {
          const { MongoDBStore } = await import("./database/mongodb.js");
          return new MongoDBStore(config as MongoDBConfig);
        },
        ["mongodb", "mongo", "atlas"],
      );

      // Elasticsearch - Elasticsearch dense_vector with kNN
      VectorStoreFactory.registerStore(
        VectorStoreName.ELASTICSEARCH,
        async (config) => {
          const { ElasticsearchStore } = await import(
            "./database/elasticsearch.js"
          );
          return new ElasticsearchStore(config as ElasticsearchConfig);
        },
        ["elasticsearch", "elastic", "es"],
      );

      // OpenSearch - OpenSearch k-NN plugin
      VectorStoreFactory.registerStore(
        VectorStoreName.OPENSEARCH,
        async (config) => {
          const { OpenSearchStore } = await import("./database/opensearch.js");
          return new OpenSearchStore(config as OpenSearchConfig);
        },
        ["opensearch", "aws-opensearch"],
      );

      // ========================================
      // Embedded/local stores (Tier 3)
      // ========================================

      // Chroma - Lightweight embedded store
      VectorStoreFactory.registerStore(
        VectorStoreName.CHROMA,
        async (config) => {
          const { ChromaStore } = await import("./embedded/chroma.js");
          return new ChromaStore(config as ChromaConfig);
        },
        ["chroma", "chromadb"],
      );

      // Lance - High-performance columnar storage with native vector search
      VectorStoreFactory.registerStore(
        VectorStoreName.LANCE,
        async (config) => {
          const { LanceStore } = await import("./embedded/lance.js");
          return new LanceStore(config as LanceConfig);
        },
        ["lance", "lancedb"],
      );

      // DuckDB - Analytical database with VSS extension
      VectorStoreFactory.registerStore(
        VectorStoreName.DUCKDB,
        async (config) => {
          const { DuckDBStore } = await import("./embedded/duckdb.js");
          return new DuckDBStore(config as DuckDBConfig);
        },
        ["duckdb", "duck"],
      );

      // LibSQL - SQLite-compatible with vector search (Turso-compatible)
      VectorStoreFactory.registerStore(
        VectorStoreName.LIBSQL,
        async (config) => {
          const { LibSQLStore } = await import("./embedded/libsql.js");
          return new LibSQLStore(config as LibSQLConfig);
        },
        ["libsql", "turso", "sqlite-vector"],
      );

      // ========================================
      // Enterprise stores (Tier 2)
      // ========================================

      // Milvus - Enterprise-scale vector database
      VectorStoreFactory.registerStore(
        VectorStoreName.MILVUS,
        async (config) => {
          const { MilvusStore } = await import("./enterprise/milvus.js");
          return new MilvusStore(config as MilvusConfig);
        },
        ["milvus"],
      );

      // Zilliz - Managed Milvus cloud service
      VectorStoreFactory.registerStore(
        VectorStoreName.ZILLIZ,
        async (config) => {
          const { ZillizStore } = await import("./enterprise/zilliz.js");
          return new ZillizStore(config as ZillizConfig);
        },
        ["zilliz", "zilliz-cloud"],
      );

      // Azure AI Search - Microsoft's enterprise search with vector support
      VectorStoreFactory.registerStore(
        VectorStoreName.AZURE_AI_SEARCH,
        async (config) => {
          const { AzureAiSearchStore } = await import(
            "./enterprise/azureAiSearch.js"
          );
          return new AzureAiSearchStore(config as AzureAiSearchConfig);
        },
        ["azure-ai-search", "azure-search", "azure-cognitive-search"],
      );

      // Google Vertex Vector Search - GCP's managed vector search
      VectorStoreFactory.registerStore(
        VectorStoreName.VERTEX_VECTOR,
        async (config) => {
          const { VertexVectorSearchStore } = await import(
            "./enterprise/vertexVectorSearch.js"
          );
          return new VertexVectorSearchStore(
            config as VertexVectorSearchConfig,
          );
        },
        ["vertex-vector", "vertex-ai", "google-vertex", "matching-engine"],
      );

      // AWS OpenSearch - AWS managed OpenSearch with k-NN plugin
      VectorStoreFactory.registerStore(
        VectorStoreName.AWS_OPENSEARCH,
        async (config) => {
          const { AwsOpensearchStore } = await import(
            "./enterprise/awsOpensearch.js"
          );
          return new AwsOpensearchStore(config as AwsOpensearchConfig);
        },
        ["aws-opensearch", "amazon-opensearch", "aos"],
      );

      // Couchbase - Enterprise NoSQL with vector search
      VectorStoreFactory.registerStore(
        VectorStoreName.COUCHBASE,
        async (config) => {
          const { CouchbaseStore } = await import("./enterprise/couchbase.js");
          return new CouchbaseStore(config as CouchbaseConfig);
        },
        ["couchbase", "couchbase-vector"],
      );

      // Vespa - High-performance enterprise search with vector capabilities
      VectorStoreFactory.registerStore(
        VectorStoreName.VESPA,
        async (config) => {
          const { VespaStore } = await import("./enterprise/vespa.js");
          return new VespaStore(config as VespaConfig);
        },
        ["vespa", "vespa-ai"],
      );

      // Marqo - End-to-end vector search with built-in embedding generation
      VectorStoreFactory.registerStore(
        VectorStoreName.MARQO,
        async (config) => {
          const { MarqoStore } = await import("./enterprise/marqo.js");
          return new MarqoStore(config as MarqoConfig);
        },
        ["marqo", "marqo-ai"],
      );

      // Mark registration as complete
      VectorStoreRegistry.registered = true;
      VectorStoreFactory.markAsRegistered();

      logger.debug("All vector stores registered successfully", {
        stores: VectorStoreFactory.getAvailableStores(),
      });
    } catch (error) {
      logger.error("Failed to register vector stores", { error });
      throw error;
    }
  }

  /**
   * Check if stores have been registered
   */
  static isRegistered(): boolean {
    return VectorStoreRegistry.registered;
  }

  /**
   * Clear all registrations (for testing)
   */
  static clearRegistrations(): void {
    VectorStoreRegistry.registered = false;
    VectorStoreFactory.clearRegistrations();
  }

  /**
   * Register a single store manually
   * Useful for adding custom stores at runtime
   */
  static async registerStore(
    name: VectorStoreName | string,
    importPath: string,
    className: string,
    aliases: string[] = [],
  ): Promise<void> {
    VectorStoreFactory.registerStore(
      name,
      async (config) => {
        const module = await import(importPath);
        const StoreClass = module[className];
        return new StoreClass(config);
      },
      aliases,
    );
  }
}
