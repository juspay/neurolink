[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliGenerateResult

# Type Alias: CliGenerateResult

> **CliGenerateResult** = [`CommandResult`](CommandResult.md) & `object`

Defined in: [types/cli.ts:410](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L410)

Generate command result

## Type Declaration

### content

> **content**: `string`

### provider?

> `optional` **provider?**: `string`

### model?

> `optional` **model?**: `string`

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

### responseTime?

> `optional` **responseTime?**: `number`

### toolCalls?

> `optional` **toolCalls?**: [`ToolCall`](ToolCall.md)[]

### toolResults?

> `optional` **toolResults?**: [`ToolResult`](ToolResult.md)[]

### analytics?

> `optional` **analytics?**: [`AnalyticsData`](AnalyticsData.md)

### evaluation?

> `optional` **evaluation?**: [`EvaluationData`](EvaluationData.md)

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

### toolExecutions?

> `optional` **toolExecutions?**: `object`[]

### enhancedWithTools?

> `optional` **enhancedWithTools?**: `boolean`

### availableTools?

> `optional` **availableTools?**: `object`[]

### audio?

> `optional` **audio?**: [`TTSResult`](TTSResult.md)

TTS audio result when TTS is enabled

### video?

> `optional` **video?**: [`VideoGenerationResult`](VideoGenerationResult.md)

Video generation result when video mode is enabled

### ppt?

> `optional` **ppt?**: [`PPTGenerationResult`](PPTGenerationResult.md)

PPT generation result when ppt mode is enabled

### imageOutput?

> `optional` **imageOutput?**: \{ `base64`: `string`; `savedPath?`: `string`; \} \| `null`
