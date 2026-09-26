[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamCommandArgs

# Type Alias: StreamCommandArgs

> **StreamCommandArgs** = [`BaseCommandArgs`](BaseCommandArgs.md) & [`CliToolRoutingFlags`](CliToolRoutingFlags.md) & [`CliClassifierRouterFlags`](CliClassifierRouterFlags.md) & `object`

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

### agentMode?

> `optional` **agentMode?**: `boolean`

Prepend Neurolink's versioned terminal agent instructions

### maxSteps?

> `optional` **maxSteps?**: `number`

Maximum tool-calling steps

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
