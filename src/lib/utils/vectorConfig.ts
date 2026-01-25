/**
 * Vector Store Configuration Utilities
 * Environment variable handling and validation for vector stores
 */

import { VectorStoreName } from "../types/vectorTypes.js";

/**
 * Vector store configuration metadata
 */
export type VectorStoreConfigMeta = {
  /** All supported environment variables */
  envVars: string[];
  /** Required environment variables */
  requiredEnvVars: string[];
  /** Documentation/setup URL */
  setupUrl: string;
  /** Default port (if applicable) */
  defaultPort?: number;
};

/**
 * Configuration metadata for each vector store
 */
export const vectorStoreConfigs: Record<
  VectorStoreName,
  VectorStoreConfigMeta
> = {
  [VectorStoreName.PINECONE]: {
    envVars: ["PINECONE_API_KEY", "PINECONE_ENVIRONMENT", "PINECONE_INDEX"],
    requiredEnvVars: ["PINECONE_API_KEY"],
    setupUrl: "https://www.pinecone.io/",
  },
  [VectorStoreName.QDRANT]: {
    envVars: ["QDRANT_URL", "QDRANT_API_KEY"],
    requiredEnvVars: ["QDRANT_URL"],
    setupUrl: "https://qdrant.tech/",
    defaultPort: 6333,
  },
  [VectorStoreName.CHROMA]: {
    envVars: ["CHROMA_HOST", "CHROMA_PORT", "CHROMA_PATH"],
    requiredEnvVars: [],
    setupUrl: "https://www.trychroma.com/",
    defaultPort: 8000,
  },
  [VectorStoreName.PGVECTOR]: {
    envVars: [
      "PGVECTOR_CONNECTION_STRING",
      "PGVECTOR_HOST",
      "PGVECTOR_PORT",
      "PGVECTOR_DATABASE",
      "PGVECTOR_USER",
      "PGVECTOR_PASSWORD",
    ],
    requiredEnvVars: [],
    setupUrl: "https://github.com/pgvector/pgvector",
    defaultPort: 5432,
  },
  [VectorStoreName.MONGODB]: {
    envVars: ["MONGODB_CONNECTION_STRING", "MONGODB_DATABASE"],
    requiredEnvVars: ["MONGODB_CONNECTION_STRING"],
    setupUrl: "https://www.mongodb.com/atlas/database",
  },
  [VectorStoreName.ELASTICSEARCH]: {
    envVars: [
      "ELASTICSEARCH_URL",
      "ELASTICSEARCH_API_KEY",
      "ELASTICSEARCH_USERNAME",
      "ELASTICSEARCH_PASSWORD",
    ],
    requiredEnvVars: ["ELASTICSEARCH_URL"],
    setupUrl: "https://www.elastic.co/elasticsearch",
    defaultPort: 9200,
  },
  [VectorStoreName.OPENSEARCH]: {
    envVars: ["OPENSEARCH_URL", "OPENSEARCH_USERNAME", "OPENSEARCH_PASSWORD"],
    requiredEnvVars: ["OPENSEARCH_URL"],
    setupUrl: "https://opensearch.org/",
    defaultPort: 9200,
  },
  [VectorStoreName.WEAVIATE]: {
    envVars: ["WEAVIATE_URL", "WEAVIATE_API_KEY"],
    requiredEnvVars: ["WEAVIATE_URL"],
    setupUrl: "https://weaviate.io/",
    defaultPort: 8080,
  },
  [VectorStoreName.MILVUS]: {
    envVars: [
      "MILVUS_ADDRESS",
      "MILVUS_USERNAME",
      "MILVUS_PASSWORD",
      "MILVUS_TOKEN",
    ],
    requiredEnvVars: ["MILVUS_ADDRESS"],
    setupUrl: "https://milvus.io/",
    defaultPort: 19530,
  },
  [VectorStoreName.ZILLIZ]: {
    envVars: ["ZILLIZ_CLOUD_URI", "ZILLIZ_TOKEN"],
    requiredEnvVars: ["ZILLIZ_CLOUD_URI", "ZILLIZ_TOKEN"],
    setupUrl: "https://zilliz.com/",
  },
  [VectorStoreName.LANCE]: {
    envVars: ["LANCE_DB_PATH"],
    requiredEnvVars: [],
    setupUrl: "https://lancedb.com/",
  },
  [VectorStoreName.DUCKDB]: {
    envVars: ["DUCKDB_PATH"],
    requiredEnvVars: [],
    setupUrl: "https://duckdb.org/",
  },
  [VectorStoreName.CLOUDFLARE]: {
    envVars: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"],
    requiredEnvVars: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"],
    setupUrl: "https://developers.cloudflare.com/vectorize/",
  },
  [VectorStoreName.UPSTASH]: {
    envVars: ["UPSTASH_VECTOR_REST_URL", "UPSTASH_VECTOR_REST_TOKEN"],
    requiredEnvVars: ["UPSTASH_VECTOR_REST_URL", "UPSTASH_VECTOR_REST_TOKEN"],
    setupUrl: "https://upstash.com/docs/vector/overall/getstarted",
  },
  [VectorStoreName.ASTRA]: {
    envVars: ["ASTRA_DB_ENDPOINT", "ASTRA_DB_APPLICATION_TOKEN"],
    requiredEnvVars: ["ASTRA_DB_ENDPOINT", "ASTRA_DB_APPLICATION_TOKEN"],
    setupUrl: "https://docs.datastax.com/en/astra-db/",
  },
  [VectorStoreName.COUCHBASE]: {
    envVars: [
      "COUCHBASE_CONNECTION_STRING",
      "COUCHBASE_USERNAME",
      "COUCHBASE_PASSWORD",
    ],
    requiredEnvVars: ["COUCHBASE_CONNECTION_STRING"],
    setupUrl: "https://www.couchbase.com/",
  },
  [VectorStoreName.LIBSQL]: {
    envVars: ["LIBSQL_URL", "LIBSQL_AUTH_TOKEN"],
    requiredEnvVars: [],
    setupUrl: "https://turso.tech/libsql",
  },
  [VectorStoreName.AZURE_AI_SEARCH]: {
    envVars: [
      "AZURE_SEARCH_ENDPOINT",
      "AZURE_SEARCH_API_KEY",
      "AZURE_SEARCH_INDEX",
    ],
    requiredEnvVars: ["AZURE_SEARCH_ENDPOINT", "AZURE_SEARCH_API_KEY"],
    setupUrl: "https://azure.microsoft.com/en-us/services/search/",
  },
  [VectorStoreName.VERTEX_VECTOR]: {
    envVars: [
      "GOOGLE_CLOUD_PROJECT",
      "VERTEX_AI_LOCATION",
      "VERTEX_MATCHING_ENGINE_INDEX",
    ],
    requiredEnvVars: ["GOOGLE_CLOUD_PROJECT"],
    setupUrl:
      "https://cloud.google.com/vertex-ai/docs/matching-engine/overview",
  },
  [VectorStoreName.AWS_OPENSEARCH]: {
    envVars: [
      "AWS_OPENSEARCH_ENDPOINT",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_REGION",
    ],
    requiredEnvVars: ["AWS_OPENSEARCH_ENDPOINT"],
    setupUrl: "https://aws.amazon.com/opensearch-service/",
  },
  [VectorStoreName.VESPA]: {
    envVars: ["VESPA_URL", "VESPA_API_KEY"],
    requiredEnvVars: ["VESPA_URL"],
    setupUrl: "https://vespa.ai/",
    defaultPort: 8080,
  },
  [VectorStoreName.MARQO]: {
    envVars: ["MARQO_URL", "MARQO_API_KEY"],
    requiredEnvVars: ["MARQO_URL"],
    setupUrl: "https://www.marqo.ai/",
    defaultPort: 8882,
  },
};

/**
 * Get configuration from environment variables for a specific store
 * @param store The vector store name
 * @returns Configuration object with values from environment
 */
export function getVectorStoreConfigFromEnv(
  store: VectorStoreName,
): Record<string, string | undefined> {
  const config: Record<string, string | undefined> = {};
  const storeConfig = vectorStoreConfigs[store];

  if (storeConfig) {
    for (const envVar of storeConfig.envVars) {
      // Convert env var name to camelCase config key
      // e.g., PINECONE_API_KEY -> apiKey
      const key = envVar
        .replace(/^[A-Z_]+_/, "") // Remove prefix
        .toLowerCase()
        .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      config[key] = process.env[envVar];
    }
  }

  return config;
}

/**
 * Validate required environment variables for a vector store
 * @param store The vector store name
 * @returns Validation result with missing variables
 */
export function validateVectorStoreEnv(store: VectorStoreName): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const storeConfig = vectorStoreConfigs[store];
  const missing: string[] = [];
  const warnings: string[] = [];

  if (storeConfig) {
    for (const envVar of storeConfig.requiredEnvVars) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }

    // Check optional vars and warn if commonly needed ones are missing
    for (const envVar of storeConfig.envVars) {
      if (
        !storeConfig.requiredEnvVars.includes(envVar) &&
        !process.env[envVar]
      ) {
        // Only warn for commonly needed optional vars
        if (envVar.includes("API_KEY") || envVar.includes("TOKEN")) {
          warnings.push(
            `${envVar} not set (may be required for authentication)`,
          );
        }
      }
    }
  }

  return { valid: missing.length === 0, missing, warnings };
}

/**
 * Get the setup URL for a vector store
 * @param store The vector store name
 * @returns Documentation/setup URL
 */
export function getVectorStoreSetupUrl(store: VectorStoreName): string {
  return vectorStoreConfigs[store]?.setupUrl || "";
}

/**
 * Get default port for a vector store
 * @param store The vector store name
 * @returns Default port number or undefined
 */
export function getVectorStoreDefaultPort(
  store: VectorStoreName,
): number | undefined {
  return vectorStoreConfigs[store]?.defaultPort;
}

/**
 * List all available vector stores
 * @returns Array of vector store names
 */
export function listAvailableVectorStores(): VectorStoreName[] {
  return Object.values(VectorStoreName);
}

/**
 * Check if a store is available based on environment configuration
 * @param store The vector store name
 * @returns True if all required env vars are present
 */
export function isVectorStoreAvailable(store: VectorStoreName): boolean {
  return validateVectorStoreEnv(store).valid;
}
