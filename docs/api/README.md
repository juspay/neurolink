**NeuroLink API Reference v8.42.0**

---

# NeuroLink API Reference v8.42.0

NeuroLink AI Toolkit

A unified AI provider interface with support for 14+ providers,
automatic fallback, streaming, MCP tool integration, HITL security,
Redis persistence, and enterprise-grade middleware.

NeuroLink provides comprehensive AI functionality with battle-tested
patterns extracted from production systems at Juspay.

## Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Create NeuroLink instance
const neurolink = new NeuroLink();

// Generate with any provider
const result = await neurolink.generate({
  input: { text: "Explain quantum computing" },
  provider: "vertex",
  model: "gemini-3-flash",
});

console.log(result.content);
```

## Since

1.0.0

## Enumerations

- [AIProviderName](enumerations/AIProviderName.md)
- [BedrockModels](enumerations/BedrockModels.md)
- [OpenAIModels](enumerations/OpenAIModels.md)
- [VertexModels](enumerations/VertexModels.md)

## Classes

### Core

- [NeuroLink](classes/NeuroLink.md)

### Other

- [AIProviderFactory](classes/AIProviderFactory.md)
- [NeuroLinkOAuthProvider](classes/NeuroLinkOAuthProvider.md)
- [InMemoryTokenStorage](classes/InMemoryTokenStorage.md)
- [FileTokenStorage](classes/FileTokenStorage.md)
- [HTTPRateLimiter](classes/HTTPRateLimiter.md)
- [RateLimiterManager](classes/RateLimiterManager.md)
- [MCPCircuitBreaker](classes/MCPCircuitBreaker.md)
- [CircuitBreakerManager](classes/CircuitBreakerManager.md)
- [MiddlewareFactory](classes/MiddlewareFactory.md)

## Type Aliases

- [AnalyticsData](type-aliases/AnalyticsData.md)
- [EvaluationData](type-aliases/EvaluationData.md)
- [GenerateOptions](type-aliases/GenerateOptions.md)
- [GenerateResult](type-aliases/GenerateResult.md)
- [EnhancedProvider](type-aliases/EnhancedProvider.md)
- [TextGenerationOptions](type-aliases/TextGenerationOptions.md)
- [TextGenerationResult](type-aliases/TextGenerationResult.md)
- [MCPServerInfo](type-aliases/MCPServerInfo.md)
- [DiscoveredMcp](type-aliases/DiscoveredMcp.md)
- [McpMetadata](type-aliases/McpMetadata.md)
- [OAuthTokens](type-aliases/OAuthTokens.md)
- [TokenStorage](type-aliases/TokenStorage.md)
- [MCPOAuthConfig](type-aliases/MCPOAuthConfig.md)
- [OAuthClientInformation](type-aliases/OAuthClientInformation.md)
- [AuthorizationUrlResult](type-aliases/AuthorizationUrlResult.md)
- [TokenExchangeRequest](type-aliases/TokenExchangeRequest.md)
- [~~RateLimitConfig~~](type-aliases/RateLimitConfig.md)
- [HTTPRetryConfig](type-aliases/HTTPRetryConfig.md)
- [NeuroLinkMiddleware](type-aliases/NeuroLinkMiddleware.md)
- [MiddlewareConfig](type-aliases/MiddlewareConfig.md)
- [MiddlewareContext](type-aliases/MiddlewareContext.md)
- [MiddlewarePreset](type-aliases/MiddlewarePreset.md)
- [MiddlewareFactoryOptions](type-aliases/MiddlewareFactoryOptions.md)
- [DynamicModelConfig](type-aliases/DynamicModelConfig.md)
- [ModelRegistry](type-aliases/ModelRegistry.md)
- [LangfuseConfig](type-aliases/LangfuseConfig.md)
- [LangfuseSpanAttributes](type-aliases/LangfuseSpanAttributes.md)
- [TraceNameFormat](type-aliases/TraceNameFormat.md)
- [OpenTelemetryConfig](type-aliases/OpenTelemetryConfig.md)
- [ObservabilityConfig](type-aliases/ObservabilityConfig.md)
- [SupportedModelName](type-aliases/SupportedModelName.md)
- [AIModelProviderConfig](type-aliases/AIModelProviderConfig.md)
- [AIProvider](type-aliases/AIProvider.md)
- [ProviderAttempt](type-aliases/ProviderAttempt.md)
- [StreamingOptions](type-aliases/StreamingOptions.md)
- [ExecutionContext](type-aliases/ExecutionContext.md)
- [ToolInfo](type-aliases/ToolInfo.md)
- [ToolExecutionResult](type-aliases/ToolExecutionResult.md)
- [ToolContext](type-aliases/ToolContext.md)
- [ToolResult](type-aliases/ToolResult.md)
- [ToolDefinition](type-aliases/ToolDefinition.md)
- [LogLevel](type-aliases/LogLevel.md)

## Variables

- [dynamicModelProvider](variables/dynamicModelProvider.md)
- [VERSION](variables/VERSION.md)
- [DEFAULT_RATE_LIMIT_CONFIG](variables/DEFAULT_RATE_LIMIT_CONFIG.md)
- [globalRateLimiterManager](variables/globalRateLimiterManager.md)
- [DEFAULT_HTTP_RETRY_CONFIG](variables/DEFAULT_HTTP_RETRY_CONFIG.md)
- [globalCircuitBreakerManager](variables/globalCircuitBreakerManager.md)
- [DEFAULT_PROVIDER_CONFIGS](variables/DEFAULT_PROVIDER_CONFIGS.md)
- [mcpLogger](variables/mcpLogger.md)

## Functions

### Factory

- [createAIProvider](functions/createAIProvider.md)
- [createAIProviderWithFallback](functions/createAIProviderWithFallback.md)
- [createBestAIProvider](functions/createBestAIProvider.md)

### Legacy

- [~~generateText~~](functions/generateText.md)

### Other

- [initializeTelemetry](functions/initializeTelemetry.md)
- [getTelemetryStatus](functions/getTelemetryStatus.md)
- [createOAuthProviderFromConfig](functions/createOAuthProviderFromConfig.md)
- [isTokenExpired](functions/isTokenExpired.md)
- [calculateExpiresAt](functions/calculateExpiresAt.md)
- [isRetryableStatusCode](functions/isRetryableStatusCode.md)
- [isRetryableHTTPError](functions/isRetryableHTTPError.md)
- [withHTTPRetry](functions/withHTTPRetry.md)
- [initializeMCPEcosystem](functions/initializeMCPEcosystem.md)
- [listMCPs](functions/listMCPs.md)
- [executeMCP](functions/executeMCP.md)
- [getMCPStats](functions/getMCPStats.md)
- [validateTool](functions/validateTool.md)
- [initializeOpenTelemetry](functions/initializeOpenTelemetry.md)
- [flushOpenTelemetry](functions/flushOpenTelemetry.md)
- [shutdownOpenTelemetry](functions/shutdownOpenTelemetry.md)
- [getLangfuseHealthStatus](functions/getLangfuseHealthStatus.md)
- [setLangfuseContext](functions/setLangfuseContext.md)
- [getLangfuseContext](functions/getLangfuseContext.md)
- [getTracer](functions/getTracer.md)
- [getSpanProcessors](functions/getSpanProcessors.md)
- [createContextEnricher](functions/createContextEnricher.md)
- [isUsingExternalTracerProvider](functions/isUsingExternalTracerProvider.md)
- [getTracerProvider](functions/getTracerProvider.md)
- [getLangfuseSpanProcessor](functions/getLangfuseSpanProcessor.md)
- [buildObservabilityConfigFromEnv](functions/buildObservabilityConfigFromEnv.md)
- [getBestProvider](functions/getBestProvider.md)
- [getAvailableProviders](functions/getAvailableProviders.md)
- [isValidProvider](functions/isValidProvider.md)

## RAG Document Processing

### Classes

- [ChunkerFactory](classes/ChunkerFactory.md)
- [ChunkerRegistry](classes/ChunkerRegistry.md)
- [RerankerFactory](classes/RerankerFactory.md)
- [RerankerRegistry](classes/RerankerRegistry.md)
- [MDocument](classes/MDocument.md)
- [RAGPipeline](classes/RAGPipeline.md)
- [InMemoryVectorStore](classes/InMemoryVectorStore.md)
- [InMemoryBM25Index](classes/InMemoryBM25Index.md)
- [GraphRAG](classes/GraphRAG.md)

### Functions

- [createChunker](functions/createChunker.md)
- [getAvailableStrategies](functions/getAvailableStrategies.md)
- [getChunkerMetadata](functions/getChunkerMetadata.md)
- [chunkText](functions/chunkText.md)
- [createReranker](functions/createReranker.md)
- [getAvailableRerankerTypes](functions/getAvailableRerankerTypes.md)
- [rerank](functions/rerank.md)
- [batchRerank](functions/batchRerank.md)
- [simpleRerank](functions/simpleRerank.md)
- [createHybridSearch](functions/createHybridSearch.md)
- [reciprocalRankFusion](functions/reciprocalRankFusion.md)
- [linearCombination](functions/linearCombination.md)
- [loadDocument](functions/loadDocument.md)
- [loadDocuments](functions/loadDocuments.md)
- [assembleContext](functions/assembleContext.md)
- [createContextWindow](functions/createContextWindow.md)
- [prepareRAGTool](functions/prepareRAGTool.md)

### Type Aliases

- [ChunkingStrategy](type-aliases/ChunkingStrategy.md)
- [ChunkerConfig](type-aliases/ChunkerConfig.md)
- [RerankerType](type-aliases/RerankerType.md)
- [RerankerConfig](type-aliases/RerankerConfig.md)
- [HybridSearchConfig](type-aliases/HybridSearchConfig.md)
- [VectorQueryToolConfig](type-aliases/VectorQueryToolConfig.md)
- [Chunk](type-aliases/Chunk.md)
- [ChunkMetadata](type-aliases/ChunkMetadata.md)
- [RAGConfig](type-aliases/RAGConfig.md)
- [RAGPreparedTool](type-aliases/RAGPreparedTool.md)

### Using RAG Tools with generate()

#### Simplified API (Recommended)

Pass `rag: { files }` directly to `generate()` or `stream()` for automatic RAG pipeline setup. NeuroLink handles file loading, chunking, embedding, vector storage, and tool creation automatically:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Generate with RAG - just pass files
const result = await neurolink.generate({
  prompt: "What are the key features described in the docs?",
  rag: {
    files: ["./docs/guide.md", "./docs/api.md"],
    strategy: "markdown", // Optional: auto-detected from extension
    chunkSize: 512, // Optional: default 1000
    chunkOverlap: 50, // Optional: default 200
    topK: 5, // Optional: default 5
  },
});

// Stream with RAG - same API
const stream = await neurolink.stream({
  prompt: "Summarize the architecture",
  rag: { files: ["./docs/architecture.md"] },
});
```

#### Advanced API

For full control over embeddings and vector stores, use `createVectorQueryTool` directly:

```typescript
import {
  NeuroLink,
  createVectorQueryTool,
  InMemoryVectorStore,
} from "@juspay/neurolink";

const vectorStore = new InMemoryVectorStore();
// ... populate with data

const ragTool = createVectorQueryTool(
  {
    id: "kb-search",
    indexName: "knowledge-base",
    embeddingModel: { provider: "openai", modelName: "text-embedding-3-small" },
  },
  vectorStore,
);

const result = await neurolink.generate({
  input: { text: "Your question" },
  tools: [ragTool],
});
```

**Related Documentation:**

- [createVectorQueryTool](functions/createVectorQueryTool.md) - Factory function for creating vector query tools
- [InMemoryVectorStore](classes/InMemoryVectorStore.md) - In-memory vector store implementation
- [VectorQueryToolConfig](type-aliases/VectorQueryToolConfig.md) - Configuration options for vector query tools
