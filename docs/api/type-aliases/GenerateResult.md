[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenerateResult

# Type Alias: GenerateResult

> **GenerateResult** = `object` & [`MediaGenerationOutputs`](MediaGenerationOutputs.md)

Defined in: [types/generate.ts:1018](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1018)

Generate function result type - Primary output format
Future-ready for multi-modal outputs while maintaining text focus

## Type Declaration

### content

> **content**: `string`

### knowledge?

> `optional` **knowledge?**: [`KnowledgeGroundingMetadata`](KnowledgeGroundingMetadata.md)

Knowledge-grounding diagnostics for this turn (present only when grounding ran).

### structuredData?

> `optional` **structuredData?**: `unknown`

Parsed structured object when a `schema` was requested. Populated from
AI-SDK experimental_output, or from text-mode coercion (balanced-scan +
jsonrepair). Prefer this over JSON.parse(content) — it never requires the
caller to re-parse hand-escaped model text.

### outputs?

> `optional` **outputs?**: `object`

#### outputs.text

> **text**: `string`

### provider?

> `optional` **provider?**: `string`

### model?

> `optional` **model?**: `string`

### finishReason?

> `optional` **finishReason?**: `string`

### stopReason?

> `optional` **stopReason?**: [`GenerateStopReason`](GenerateStopReason.md)

Why the agentic turn ended, independent of the provider-shaped
`finishReason`. Populated by the native Vertex loops (Gemini + Claude);
undefined on providers that don't run a native loop — fall back to
`finishReason` heuristics there.

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Verbatim provider finish/stop reason for the turn's terminal model call
(e.g. "MALFORMED_FUNCTION_CALL", "MAX_TOKENS", "max_tokens", "tool_use").

### stepsUsed?

> `optional` **stepsUsed?**: `number`

Number of agentic steps (model calls) the turn used.

### jsonRepaired?

> `optional` **jsonRepaired?**: `boolean`

True when the schema JSON in `content`/`structuredData` was repaired from
malformed model text (jsonrepair ran). The result is still valid JSON.

### jsonTruncated?

> `optional` **jsonTruncated?**: `boolean`

True when the schema JSON appears truncated — the model hit the output
token cap (finishReason="length") or the recovered object came from an
unclosed span. `structuredData` may be incomplete; raise `maxTokens`.

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

### responseTime?

> `optional` **responseTime?**: `number`

### toolCalls?

> `optional` **toolCalls?**: `object`[]

### toolResults?

> `optional` **toolResults?**: `unknown`[]

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

### toolExecutions?

> `optional` **toolExecutions?**: [`ToolExecutionRecord`](ToolExecutionRecord.md)[]

Real per-call tool execution records captured in the tool loop —
params, bounded serialized result, error flag, and timing per call.
Populated on the AI-SDK loop and the native agentic loops alike.
Bounded by `toolExecutionCapture` (default on, ~8KB per result).

### enhancedWithTools?

> `optional` **enhancedWithTools?**: `boolean`

### availableTools?

> `optional` **availableTools?**: `object`[]

### analytics?

> `optional` **analytics?**: [`AnalyticsData`](AnalyticsData.md)

### evaluation?

> `optional` **evaluation?**: [`EvaluationData`](EvaluationData.md)

### factoryMetadata?

> `optional` **factoryMetadata?**: `object`

#### factoryMetadata.enhancementApplied

> **enhancementApplied**: `boolean`

#### factoryMetadata.enhancementType?

> `optional` **enhancementType?**: `string`

#### factoryMetadata.domainType?

> `optional` **domainType?**: `string`

#### factoryMetadata.processingTime?

> `optional` **processingTime?**: `number`

#### factoryMetadata.configurationUsed?

> `optional` **configurationUsed?**: [`StandardRecord`](StandardRecord.md)

#### factoryMetadata.migrationPerformed?

> `optional` **migrationPerformed?**: `boolean`

#### factoryMetadata.legacyFieldsPreserved?

> `optional` **legacyFieldsPreserved?**: `boolean`

### streamingMetadata?

> `optional` **streamingMetadata?**: `object`

#### streamingMetadata.streamingUsed

> **streamingUsed**: `boolean`

#### streamingMetadata.fallbackToGenerate?

> `optional` **fallbackToGenerate?**: `boolean`

#### streamingMetadata.chunkCount?

> `optional` **chunkCount?**: `number`

#### streamingMetadata.streamingDuration?

> `optional` **streamingDuration?**: `number`

#### streamingMetadata.streamId?

> `optional` **streamId?**: `string`

#### streamingMetadata.bufferOptimization?

> `optional` **bufferOptimization?**: `boolean`

### workflow?

> `optional` **workflow?**: `object`

#### workflow.originalResponse

> **originalResponse**: `string`

#### workflow.processedResponse

> **processedResponse**: `string`

#### workflow.ensembleResponses

> **ensembleResponses**: `object`[]

#### workflow.judgeScores?

> `optional` **judgeScores?**: `object`

#### workflow.judgeScores.scores

> **scores**: `Record`\<`string`, `number`\>

#### workflow.judgeScores.reasoning?

> `optional` **reasoning?**: `string`

#### workflow.judgeScores.selectedModel

> **selectedModel**: `string`

#### workflow.selectedModel

> **selectedModel**: `string`

#### workflow.metrics

> **metrics**: `object`

#### workflow.metrics.totalTime

> **totalTime**: `number`

#### workflow.metrics.ensembleTime

> **ensembleTime**: `number`

#### workflow.metrics.judgeTime?

> `optional` **judgeTime?**: `number`

#### workflow.metrics.conditioningTime?

> `optional` **conditioningTime?**: `number`

#### workflow.workflowId

> **workflowId**: `string`

#### workflow.workflowName

> **workflowName**: `string`

### reasoning?

> `optional` **reasoning?**: `string`

Thinking/reasoning text from provider (Anthropic thinking blocks, Gemini thought parts)

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Token count for reasoning content

### retries?

> `optional` **retries?**: `object`

#### retries.count

> **count**: `number`

#### retries.errors

> **errors**: `object`[]

### limits?

> `optional` **limits?**: [`ClaudeLimitSnapshot`](ClaudeLimitSnapshot.md)

Account limit state for this request, parsed from Anthropic's
`anthropic-ratelimit-*` response headers (plus the NeuroLink Claude
proxy's `x-neurolink-*` additions when routed through it).

Subscription windows report utilization, so headroom is a percentage
(`sessionLeftPct`) rather than an absolute count — Anthropic publishes no
remaining message or token figure for them. API-key accounts do carry
absolute `requestsRemaining` / `tokensRemaining`.
