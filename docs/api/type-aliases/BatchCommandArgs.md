[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchCommandArgs

# Type Alias: BatchCommandArgs

> **BatchCommandArgs** = [`BaseCommandArgs`](BaseCommandArgs.md) & [`CliToolRoutingFlags`](CliToolRoutingFlags.md) & [`CliClassifierRouterFlags`](CliClassifierRouterFlags.md) & `object`

Defined in: [types/cli.ts:162](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L162)

Batch command arguments

## Type Declaration

### promptsFile?

> `optional` **promptsFile?**: `string`

Prompts-list file path (the `<promptsFile>` positional)

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

### delay?

> `optional` **delay?**: `number`

Delay between requests (ms)

### output?

> `optional` **output?**: `string`

Output file

### disableTools?

> `optional` **disableTools?**: `boolean`

Disable tools
