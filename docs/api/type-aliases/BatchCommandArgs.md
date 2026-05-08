[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchCommandArgs

# Type Alias: BatchCommandArgs

> **BatchCommandArgs** = [`BaseCommandArgs`](BaseCommandArgs.md) & `object`

Defined in: [types/cli.ts:155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L155)

Batch command arguments

## Type Declaration

### file?

> `optional` **file?**: `string`

Input file path

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
