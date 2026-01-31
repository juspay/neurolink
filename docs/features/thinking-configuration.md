# Extended Thinking Configuration

Enable extended thinking/reasoning modes for AI models that support deeper reasoning capabilities. This feature allows models to "think through" complex problems before providing a response.

## Overview

NeuroLink supports extended thinking/reasoning configuration for models that provide this capability. Extended thinking enables models to perform more thorough reasoning, particularly useful for complex tasks like mathematical proofs, coding problems, and multi-step analysis.

## Supported Models

### Gemini 3 Models (Google Vertex AI / AI Studio)

- `gemini-3-pro-preview` - Full thinking support with high token budgets (up to 100,000)
- `gemini-3-flash-preview` - Fast thinking with support for "minimal" level (up to 50,000)

### Gemini 2.5 Models (Google Vertex AI / AI Studio)

- `gemini-2.5-pro` - Supports thinking configuration (up to 32,000 tokens)
- `gemini-2.5-flash` - Supports thinking configuration (up to 32,000 tokens)

### Claude Models (Anthropic)

- `claude-3-7-sonnet-20250219` - Extended thinking via budget tokens
- Other Claude 3.x models with thinking capability

## Quick Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Gemini 3 with thinking level
const result = await neurolink.generate({
  input: { text: "Solve this complex problem..." },
  provider: "vertex",
  model: "gemini-3-pro-preview",
  thinkingConfig: {
    thinkingLevel: "high",
  },
});

console.log(result.content);
```

## Gemini 3 Thinking Configuration

For Gemini 3 models, use `thinkingLevel` to control reasoning depth:

```typescript
const response = await neurolink.generate({
  input: { text: "Prove that the square root of 2 is irrational" },
  provider: "vertex",
  model: "gemini-3-flash-preview",
  thinkingConfig: {
    thinkingLevel: "high", // 'minimal' | 'low' | 'medium' | 'high'
  },
});
```

### Thinking Levels

| Level     | Description                            | Best For                        |
| --------- | -------------------------------------- | ------------------------------- |
| `minimal` | Near-zero thinking (Flash models only) | Simple queries requiring speed  |
| `low`     | Fast reasoning for simple tasks        | Quick analysis, summaries       |
| `medium`  | Balanced reasoning/latency trade-off   | General-purpose tasks           |
| `high`    | Maximum reasoning depth                | Complex reasoning, math, coding |

### Maximum Token Budgets by Model

| Model              | Max Thinking Budget |
| ------------------ | ------------------- |
| `gemini-3-pro-*`   | 100,000 tokens      |
| `gemini-3-flash-*` | 50,000 tokens       |
| `gemini-2.5-*`     | 32,000 tokens       |

## Anthropic Claude Thinking Configuration

For Claude models, use `budgetTokens` to set the thinking token budget:

```typescript
const response = await neurolink.generate({
  input: { text: "Solve this complex math problem step by step..." },
  provider: "anthropic",
  model: "claude-3-7-sonnet-20250219",
  thinkingConfig: {
    enabled: true,
    budgetTokens: 10000, // Range: 5000-100000
  },
});
```

### Budget Token Guidelines

- **Minimum**: 5,000 tokens
- **Maximum**: 100,000 tokens
- **Recommended for simple tasks**: 5,000-10,000 tokens
- **Recommended for complex reasoning**: 20,000-50,000 tokens
- **Maximum depth**: 50,000-100,000 tokens

## Configuration Options

The `thinkingConfig` object supports the following options:

```typescript
thinkingConfig: {
  enabled?: boolean;           // Enable/disable thinking
  type?: "enabled" | "disabled"; // Alternative enable/disable
  budgetTokens?: number;       // Token budget (Anthropic models)
  thinkingLevel?: "minimal" | "low" | "medium" | "high"; // Thinking level (Gemini models)
}
```

## CLI Usage

Extended thinking is also available via the CLI:

```bash
# Enable thinking with default settings
neurolink generate "Solve this problem" --thinking

# Set thinking budget for Anthropic
neurolink generate "Complex problem" --provider anthropic --thinking --thinkingBudget 20000

# Set thinking level for Gemini 3
neurolink generate "Complex problem" --provider vertex --model gemini-3-pro-preview --thinkingLevel high
```

### CLI Options

| Option             | Description                                           | Default |
| ------------------ | ----------------------------------------------------- | ------- |
| `--thinking`       | Enable extended thinking                              | false   |
| `--thinkingBudget` | Token budget (Anthropic: 5000-100000)                 | 10000   |
| `--thinkingLevel`  | Thinking level (Gemini 3: minimal, low, medium, high) | medium  |

## Best Practices

### When to Use High Thinking

- Complex mathematical proofs and calculations
- Multi-step coding problems and debugging
- Detailed analysis requiring multiple considerations
- Tasks where accuracy is more important than speed

### When to Use Low/Minimal Thinking

- Simple queries where speed matters
- Straightforward information retrieval
- Quick summaries and formatting tasks
- High-volume, latency-sensitive applications

### General Guidelines

1. **Start with medium**: Use `medium` as your default and adjust based on results
2. **Match model to task**: Use Pro models for complex tasks, Flash for speed
3. **Monitor token usage**: Higher thinking levels consume more tokens
4. **Test performance**: Compare response quality vs. latency for your use case

## Example: Complex Reasoning Task

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

// Complex coding problem with high reasoning
const result = await neurolink.generate({
  input: {
    text: `
      Design an optimal algorithm to find the longest palindromic subsequence
      in a string. Explain your approach, prove its correctness, and analyze
      the time and space complexity.
    `,
  },
  provider: "vertex",
  model: "gemini-3-pro-preview",
  thinkingConfig: {
    thinkingLevel: "high",
  },
  maxTokens: 4000,
});

console.log(result.content);
```

## Model Detection Utilities

NeuroLink provides utilities to check thinking support:

```typescript
import {
  supportsThinkingConfig,
  getMaxThinkingBudgetTokens,
} from "@juspay/neurolink";

// Check if a model supports thinking
const supports = supportsThinkingConfig("gemini-3-pro-preview"); // true

// Get maximum budget for a model
const maxBudget = getMaxThinkingBudgetTokens("gemini-3-flash-preview"); // 50000
```

## Important Notes

- **Provider compatibility**: Thinking configuration is provider-specific. Gemini uses `thinkingLevel`, Claude uses `budgetTokens`
- **Token consumption**: Extended thinking uses additional tokens beyond the response
- **Latency impact**: Higher thinking levels increase response time
- **Not all models support thinking**: Check `supportsThinkingConfig()` before enabling
- **Streaming support**: Thinking configuration works with both `generate()` and `stream()`

## See Also

- [API Reference](../sdk/api-reference.md#generate)
- [Provider Configuration](../getting-started/provider-setup.md)
- [Streaming](./regional-streaming.md)
