**NeuroLink API Reference v8.32.0**

---

# NeuroLink API Reference v8.32.0

NeuroLink AI Toolkit

A unified AI provider interface with support for 13+ providers,
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
- [buildObservabilityConfigFromEnv](functions/buildObservabilityConfigFromEnv.md)
- [getBestProvider](functions/getBestProvider.md)
- [getAvailableProviders](functions/getAvailableProviders.md)
- [isValidProvider](functions/isValidProvider.md)
