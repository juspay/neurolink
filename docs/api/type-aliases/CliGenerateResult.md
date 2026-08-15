[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliGenerateResult

# Type Alias: CliGenerateResult

> **CliGenerateResult** = [`CommandResult`](CommandResult.md) & `object`

Defined in: [types/cli.ts:424](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L424)

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

### avatar?

> `optional` **avatar?**: [`AvatarResult`](AvatarResult.md)

Avatar (talking-head) generation result when avatar mode is enabled

### music?

> `optional` **music?**: [`MusicResult`](MusicResult.md)

Music generation result when music mode is enabled

### ppt?

> `optional` **ppt?**: [`PPTGenerationResult`](PPTGenerationResult.md)

PPT generation result when ppt mode is enabled

### imageOutput?

> `optional` **imageOutput?**: \{ `base64`: `string`; `savedPath?`: `string`; \} \| `null`
