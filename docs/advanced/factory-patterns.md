# Factory Pattern Migration Guide

## Overview

NeuroLink has been refactored to use a unified factory pattern architecture where all providers inherit from a common `BaseProvider` class. This provides consistent tool support and behavior across all AI providers.

## What Changed

### 1. Unified BaseProvider Architecture

All providers now inherit from `BaseProvider`, which provides:

- Built-in tool support (6 core tools)
- Consistent `generate()` and `stream()` methods
- Analytics and evaluation capabilities
- Standardized error handling

### 2. Automatic Tool Support

Every provider automatically includes these tools:

- `getCurrentTime` - Get current date and time
- `readFile` - Read file contents
- `listDirectory` - List directory contents
- `calculateMath` - Perform calculations
- `writeFile` - Write to files
- `searchFiles` - Search for files by pattern

### 3. Simplified Provider Implementation

Providers no longer need to implement their own tool handling - they inherit it from BaseProvider. This means:

- No more `executeGenerate` methods in individual providers
- Consistent tool behavior across all providers
- Less code duplication

## Migration Steps

### For Users

**Good news! There are no breaking changes.** Your existing code will continue to work exactly as before.

#### Tool Usage (No Changes Required)

```typescript
// This works exactly as before
const provider = createBestAIProvider("openai");
const result = await provider.generate({
  input: { text: "What time is it?" },
});
// Tools are used automatically
```

#### Disabling Tools (New Option)

```typescript
// New: You can now disable tools if needed
const result = await provider.generate({
  input: { text: "What time is it?" },
  disableTools: true, // New option
});
// Will use training data instead of real-time tools
```

### For Provider Developers

If you've created custom providers, you'll need to update them to use the new pattern:

#### Before (Old Pattern)

```typescript
export class CustomProvider implements AIProvider {
  async executeGenerate(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    // Custom implementation with manual tool handling
    const tools = await this.getTools();
    // ... complex tool execution logic
  }
}
```

#### After (New Pattern)

```typescript
export class CustomProvider extends BaseProvider {
  // No executeGenerate needed - BaseProvider handles it

  protected getAISDKModel(): LanguageModelV1 {
    // Return your AI SDK model instance
    return this.model;
  }

  protected getProviderName(): AIProviderName {
    return "custom";
  }

  protected getDefaultModel(): string {
    return "custom-model";
  }
}
```

## Provider Tool Support Status

After the refactoring, here's the current status of tool support:

| Provider     | Status            | Notes                                                |
| ------------ | ----------------- | ---------------------------------------------------- |
| OpenAI       | ✅ Full Support   | All tools working correctly                          |
| Google AI    | ✅ Full Support   | Excellent tool execution                             |
| Anthropic    | ✅ Full Support   | Working after max_tokens fix                         |
| Azure OpenAI | ✅ Full Support   | Same as OpenAI                                       |
| Mistral      | ✅ Full Support   | Good tool support                                    |
| HuggingFace  | ⚠️ Partial        | Model sees tools but may describe instead of execute |
| Vertex AI    | ⚠️ Partial        | Tools available but may not execute                  |
| Ollama       | ❌ Limited        | Requires specific models (e.g., gemma3n)             |
| Bedrock      | ✅ Full Support\* | Requires valid AWS credentials                       |

## Benefits of the New Architecture

1. **Consistency**: All providers behave the same way with tools
2. **Maintainability**: Less code duplication, easier to update
3. **Reliability**: Centralized tool handling reduces bugs
4. **Extensibility**: Easy to add new tools for all providers at once
5. **Testing**: Simplified testing with consistent behavior

## Common Issues and Solutions

### Issue: Provider Not Using Tools

**Solution**: Check if your model supports function calling. Some models (especially older or smaller ones) may not support tools.

```typescript
// For providers with limited tool support
const result = await provider.generate({
  input: { text: "What time is it?" },
  disableTools: true, // Explicitly disable tools
});
```

### Issue: HuggingFace Describing Tools Instead of Using Them

**Solution**: This is a model limitation. Use models that support function calling:

- `mistralai/Mixtral-8x7B-Instruct-v0.1`
- `mistralai/Mistral-7B-Instruct-v0.2`

### Issue: Ollama Returns Empty Content

**Solution**: Use models that support tool calling:

```bash
export OLLAMA_MODEL="gemma3n:latest"
# or
export OLLAMA_MODEL="aliafshar/gemma3-it-qat-tools:latest"
```

### Issue: Vertex AI Not Using Tools

**Solution**: This may require schema formatting adjustments. The Vertex provider needs to format tools according to Google's Gemini API schema.

## Future Improvements

1. **Dynamic Tool Loading**: Ability to add custom tools at runtime
2. **Provider-Specific Tool Formatting**: Automatic adaptation of tool schemas for each provider
3. **Tool Usage Analytics**: Detailed metrics on which tools are used most
4. **Tool Caching**: Cache tool results for better performance

## Support

If you encounter any issues with the migration:

1. Check the [provider status documentation](./UPDATED_PROVIDER_TEST_RESULTS.md)
2. Review the [provider configuration guide](../getting-started/provider-setup.md)
3. Open an issue on GitHub with details about your use case

---

Remember: **No breaking changes!** Your existing code continues to work. The factory pattern refactoring improves the internal architecture while maintaining full backward compatibility.
