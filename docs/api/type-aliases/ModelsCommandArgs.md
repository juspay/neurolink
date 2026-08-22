[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelsCommandArgs

# Type Alias: ModelsCommandArgs

> **ModelsCommandArgs** = `Omit`\<[`BaseCommandArgs`](BaseCommandArgs.md), `"format"`\> & `object`

Defined in: [types/cli.ts:239](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L239)

Models command arguments - Enhanced for model management

## Type Declaration

### provider?

> `optional` **provider?**: `string` \| `string`[]

AI provider to query (single or array)

### category?

> `optional` **category?**: `string`

Model category filter

### capability?

> `optional` **capability?**: `string`[]

Model capability filter (array)

### deprecated?

> `optional` **deprecated?**: `boolean`

Include deprecated models

### query?

> `optional` **query?**: `string`

Search query (capability, use case, or model name)

### useCase?

> `optional` **useCase?**: `string`

Model use case filter

### maxCost?

> `optional` **maxCost?**: `number`

Maximum cost per 1K tokens (USD)

### minContext?

> `optional` **minContext?**: `number`

Minimum context window size (tokens)

### maxContext?

> `optional` **maxContext?**: `number`

Maximum context window size (tokens)

### performance?

> `optional` **performance?**: `"fast"` \| `"medium"` \| `"slow"` \| `"high"` \| `"low"`

Required performance level

### coding?

> `optional` **coding?**: `boolean`

Optimize for code generation and programming

### creative?

> `optional` **creative?**: `boolean`

Optimize for creative writing and content

### analysis?

> `optional` **analysis?**: `boolean`

Optimize for data analysis and research

### conversation?

> `optional` **conversation?**: `boolean`

Optimize for conversational interactions

### reasoning?

> `optional` **reasoning?**: `boolean`

Optimize for logical reasoning tasks

### translation?

> `optional` **translation?**: `boolean`

Optimize for language translation

### summarization?

> `optional` **summarization?**: `boolean`

Optimize for text summarization

### costEffective?

> `optional` **costEffective?**: `boolean`

Prioritize cost-effectiveness

### highQuality?

> `optional` **highQuality?**: `boolean`

Prioritize output quality over cost

### fast?

> `optional` **fast?**: `boolean`

Prioritize response speed

### requireVision?

> `optional` **requireVision?**: `boolean`

Require vision/image processing capability

### requireFunctionCalling?

> `optional` **requireFunctionCalling?**: `boolean`

Require function calling capability

### excludeProviders?

> `optional` **excludeProviders?**: `string`[]

Exclude specific providers

### preferLocal?

> `optional` **preferLocal?**: `boolean`

Prefer local/offline models

### model?

> `optional` **model?**: `string`

Model name, alias, or partial match to resolve

### fuzzy?

> `optional` **fuzzy?**: `boolean`

Enable fuzzy matching for partial names

### models?

> `optional` **models?**: `string`[]

Model IDs or aliases to compare

### detailed?

> `optional` **detailed?**: `boolean`

Show detailed statistics breakdown

### format?

> `optional` **format?**: `"table"` \| `"json"` \| `"compact"`

Output format for models command

### list?

> `optional` **list?**: `boolean`

List all available models

### stats?

> `optional` **stats?**: `boolean`

Show model statistics

### pricing?

> `optional` **pricing?**: `boolean`

Show model pricing

### resolve?

> `optional` **resolve?**: `boolean`

Resolve best model for criteria

### maxTokens?

> `optional` **maxTokens?**: `number`

Maximum tokens filter
