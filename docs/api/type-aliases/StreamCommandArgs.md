[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamCommandArgs

# Type Alias: StreamCommandArgs

> **StreamCommandArgs** = [`BaseCommandArgs`](BaseCommandArgs.md) & `object`

Defined in: [types/cli.ts:127](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L127)

Stream command arguments

## Type Declaration

### input?

> `optional` **input?**: `string`

Input text or prompt

### provider?

> `optional` **provider?**: `string`

AI provider to use

### model?

> `optional` **model?**: `string`

Model name

### system?

> `optional` **system?**: `string`

System prompt

### temperature?

> `optional` **temperature?**: `number`

Temperature setting

### maxTokens?

> `optional` **maxTokens?**: `number`

Maximum tokens

### disableTools?

> `optional` **disableTools?**: `boolean`

Disable tools

### thinking?

> `optional` **thinking?**: `boolean`

Enable extended thinking/reasoning

### thinkingBudget?

> `optional` **thinkingBudget?**: `number`

Token budget for thinking

### thinkingLevel?

> `optional` **thinkingLevel?**: `"minimal"` \| `"low"` \| `"medium"` \| `"high"`

Thinking level for extended reasoning

### region?

> `optional` **region?**: `string`

Vertex AI region
