# NeuroLink Cookbook

Welcome to the NeuroLink Cookbook! This collection of recipes provides practical, copy-paste ready solutions for common use cases and challenges when building with NeuroLink.

## What's in the Cookbook?

Each recipe follows a consistent structure:

- **Problem**: What challenge does this solve?
- **Solution**: High-level approach
- **Code**: Complete, working TypeScript example
- **Explanation**: Step-by-step breakdown
- **Variations**: Alternative approaches
- **See Also**: Related recipes and documentation

## Recipe Categories

### Getting Started

<!-- Absolute paths required: sync-docs.ts incorrectly resolves relative paths for new cookbook files -->

- [**Basic Streaming**](/docs/cookbook/basic-streaming) - Stream AI responses in real time with the `result.stream` pattern
- [**Multimodal Images**](/docs/cookbook/multimodal-images) - Send images to vision models for analysis, OCR, and comparison
- [**Provider Switching**](/docs/cookbook/provider-switching) - Switch providers at runtime, compare outputs, and implement fallback
- [**Embeddings Basics**](/docs/cookbook/embeddings-basics) - Generate embeddings, compare similarity, and build semantic search

### Reliability & Error Handling

- [**Streaming with Retry Logic**](streaming-with-retry.md) - Handle network interruptions and implement automatic retry for streaming responses
- [**Error Recovery Patterns**](error-recovery.md) - Graceful degradation and error handling strategies
- [**Multi-Provider Fallback**](multi-provider-fallback.md) - Automatically switch providers when one fails

### Performance & Optimization

- [**Cost Optimization**](cost-optimization.md) - Minimize token usage and API costs
- [**Rate Limit Handling**](rate-limit-handling.md) - Manage rate limits across providers
- [**Batch Processing**](batch-processing.md) - Efficiently process multiple requests

### Context Management

- [**Context Window Management**](context-window-management.md) - Handle large conversations within token limits
- [**Conversation Summarization**](conversation-summarization.md) - Automatically summarize long conversations

### Advanced Features

- [**Structured Output with JSON Schema**](structured-output.md) - Extract structured data with type safety
- [**Tool Chaining**](tool-chaining.md) - Chain multiple MCP tool calls together
- [**AutoResearch Quickstart**](autoresearch-quickstart.md) - Set up an autonomous AI experiment loop in under 5 minutes

## How to Use These Recipes

1. **Find your use case**: Browse the categories above
2. **Copy the code**: All examples are production-ready
3. **Customize**: Adapt the code to your specific needs
4. **Test**: Verify the solution works in your environment

## Prerequisites

Most recipes assume you have:

- NeuroLink installed: `npm install @juspay/neurolink`
- At least one provider configured (API keys in `.env`)
- Basic TypeScript/JavaScript knowledge

## Contributing

Found a common pattern not covered here? [Contribute a recipe](../contributing.md)!

## See Also

- [Getting Started Guide](../getting-started/installation.md)
- [API Reference](../sdk/api-reference.md)
- [Troubleshooting Guide](../guides/troubleshooting.md)
