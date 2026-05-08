[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / generateText

# ~~Function: generateText()~~

> **generateText**(`options`): `Promise`\<[`TextGenerationResult`](../type-aliases/TextGenerationResult.md)\>

Defined in: [index.ts:783](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/index.ts#L783)

Legacy generateText function for backward compatibility.

Provides standalone text generation function for existing code.
For new code, use [NeuroLink.generate](../classes/NeuroLink.md#generate) instead which provides
more features including streaming, tools, and structured output.

## Parameters

### options

[`TextGenerationOptions`](../type-aliases/TextGenerationOptions.md)

Text generation options

## Returns

`Promise`\<[`TextGenerationResult`](../type-aliases/TextGenerationResult.md)\>

Promise resolving to text generation result with content and metadata

## Deprecated

Use [NeuroLink.generate](../classes/NeuroLink.md#generate) for new code

## Examples

```typescript
import { generateText } from "@juspay/neurolink";

const result = await generateText({
  prompt: "Explain quantum computing in simple terms",
  provider: "bedrock",
  model: "claude-3-sonnet",
});
console.log(result.content);
```

```typescript
const result = await generateText({
  prompt: "Write a creative story",
  provider: "openai",
  temperature: 1.5,
  maxTokens: 500,
});
```

## See

[NeuroLink.generate](../classes/NeuroLink.md#generate) for modern API with more features

## Since

1.0.0
