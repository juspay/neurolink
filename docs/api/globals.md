[**NeuroLink API Reference v8.26.1**](README.md)

---

# NeuroLink API Reference v8.26.1

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
- [MiddlewareFactory](classes/MiddlewareFactory.md)

## Interfaces

- [ToolContext](interfaces/ToolContext.md)

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
- [ToolResult](type-aliases/ToolResult.md)
- [ToolDefinition](type-aliases/ToolDefinition.md)
- [LogLevel](type-aliases/LogLevel.md)

## Variables

- [dynamicModelProvider](variables/dynamicModelProvider.md)
- [VERSION](variables/VERSION.md)
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
