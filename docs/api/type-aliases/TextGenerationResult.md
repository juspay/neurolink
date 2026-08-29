[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextGenerationResult

# Type Alias: TextGenerationResult

> **TextGenerationResult** = `object` & [`MediaGenerationOutputs`](MediaGenerationOutputs.md)

Defined in: [types/generate.ts:1638](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1638)

Text generation result (consolidated from core types)

## Type Declaration

### content

> **content**: `string`

### structuredData?

> `optional` **structuredData?**: `unknown`

Parsed structured object when a `schema` was requested (see GenerateResult.structuredData).

### finishReason?

> `optional` **finishReason?**: `string`

### stopReason?

> `optional` **stopReason?**: [`GenerateStopReason`](GenerateStopReason.md)

Turn-exit discriminator from native agentic loops (see GenerateStopReason).

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Verbatim provider finish/stop reason for the turn's terminal model call.

### stepsUsed?

> `optional` **stepsUsed?**: `number`

Number of agentic steps (model calls) the turn used.

### jsonRepaired?

> `optional` **jsonRepaired?**: `boolean`

True when the schema JSON was repaired from malformed model text.

### jsonTruncated?

> `optional` **jsonTruncated?**: `boolean`

True when the schema JSON appears truncated (output hit the token cap).

### provider?

> `optional` **provider?**: `string`

### model?

> `optional` **model?**: `string`

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

### responseTime?

> `optional` **responseTime?**: `number`

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

### toolExecutions?

> `optional` **toolExecutions?**: `object`[]

### enhancedWithTools?

> `optional` **enhancedWithTools?**: `boolean`

### availableTools?

> `optional` **availableTools?**: `object`[]

### analytics?

> `optional` **analytics?**: [`AnalyticsData`](AnalyticsData.md)

### evaluation?

> `optional` **evaluation?**: [`EvaluationData`](EvaluationData.md)

### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

Gemini 3 thought signature for reasoning continuity across turns

### reasoning?

> `optional` **reasoning?**: `string`

Thinking/reasoning text from provider (Anthropic thinking blocks, Gemini thought parts, DeepSeek/NIM reasoning_content)

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Token count for reasoning content

### retries?

> `optional` **retries?**: `object`

#### retries.count

> **count**: `number`

#### retries.errors

> **errors**: `object`[]
