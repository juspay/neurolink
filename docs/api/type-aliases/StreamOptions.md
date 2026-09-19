[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamOptions

# Type Alias: StreamOptions

> **StreamOptions** = `object`

Defined in: [types/stream.ts:347](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L347)

## Properties

### useKnowledgeGrounding?

> `optional` **useKnowledgeGrounding?**: `boolean`

Defined in: [types/stream.ts:352](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L352)

Opt this stream call into the knowledge grounding configured on the
NeuroLink instance. Defaults to `false` when omitted.

---

### knowledgeContext?

> `optional` **knowledgeContext?**: [`KnowledgeRequestScope`](KnowledgeRequestScope.md)

Defined in: [types/stream.ts:359](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L359)

Enabled integrations used to scope knowledge retrieval for this turn.
Used only when `useKnowledgeGrounding` is true and knowledge grounding is
enabled on the NeuroLink instance.

---

### input

> **input**: `object`

Defined in: [types/stream.ts:361](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L361)

#### text?

> `optional` **text?**: `string`

Prompt text. Optional for media-only modes (avatar, music) that are driven by uploaded files rather than a prompt.

#### audio?

> `optional` **audio?**: [`AudioInputSpec`](AudioInputSpec.md)

#### images?

> `optional` **images?**: (`Buffer` \| `string` \| [`ImageWithAltText`](ImageWithAltText.md))[]

Images to include in the request.
Supports simple image data (Buffer, string) or objects with alt text for accessibility.

##### Examples

```typescript
images: [imageBuffer, "https://example.com/image.jpg"];
```

```typescript
images: [
  { data: imageBuffer, altText: "Product screenshot showing main dashboard" },
  { data: "https://example.com/chart.png", altText: "Sales chart for Q3 2024" },
];
```

#### csvFiles?

> `optional` **csvFiles?**: (`Buffer` \| `string`)[]

#### pdfFiles?

> `optional` **pdfFiles?**: (`Buffer` \| `string`)[]

#### audioFiles?

> `optional` **audioFiles?**: (`Buffer` \| `string`)[]

#### videoFiles?

> `optional` **videoFiles?**: (`Buffer` \| `string`)[]

#### files?

> `optional` **files?**: (`Buffer` \| `string` \| [`FileWithMetadata`](FileWithMetadata.md))[]

#### content?

> `optional` **content?**: [`Content`](Content.md)[]

---

### output?

> `optional` **output?**: `object`

Defined in: [types/stream.ts:390](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L390)

#### format?

> `optional` **format?**: `"text"` \| `"structured"` \| `"json"`

#### streaming?

> `optional` **streaming?**: `object`

##### streaming.chunkSize?

> `optional` **chunkSize?**: `number`

##### streaming.bufferSize?

> `optional` **bufferSize?**: `number`

##### streaming.enableProgress?

> `optional` **enableProgress?**: `boolean`

---

### csvOptions?

> `optional` **csvOptions?**: [`CSVProcessorOptions`](CSVProcessorOptions.md)

Defined in: [types/stream.ts:400](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L400)

---

### pdfOptions?

> `optional` **pdfOptions?**: `object`

Defined in: [types/stream.ts:403](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L403)

PDF processing options (#258).

#### password?

> `optional` **password?**: `string`

Password for an encrypted PDF (image-conversion fallback path).

#### maxCanvasPixels?

> `optional` **maxCanvasPixels?**: `number`

Max rendered-canvas pixels per page (#260 memory guard); oversized pages auto-downscale.

#### scale?

> `optional` **scale?**: `number`

Render scale for the image fallback used by providers without native PDF
support (#297). Higher is sharper but costs roughly the square in memory
and tokens. Range 0.1-10; defaults to PDF_LIMITS.DEFAULT_SCALE (1.5).

#### maxPages?

> `optional` **maxPages?**: `number`

Max pages converted by the image fallback (#297). Pages beyond this are
not sent to the model at all. Defaults to PDF_LIMITS.DEFAULT_MAX_PAGES (20).

---

### videoOptions?

> `optional` **videoOptions?**: `object`

Defined in: [types/stream.ts:422](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L422)

#### frames?

> `optional` **frames?**: `number`

Frames to extract. Unset lets VideoProcessor pick from the clip's duration; clamped to 100.

#### quality?

> `optional` **quality?**: `number`

Frame encoder quality, clamped to 1-100. Default 80.

#### format?

> `optional` **format?**: `"jpeg"` \| `"png"`

Frame encoding. Default jpeg.

#### transcribeAudio?

> `optional` **transcribeAudio?**: `boolean`

Not implemented yet (#433) — warns rather than silently doing nothing.

---

### audioOptions?

> `optional` **audioOptions?**: `object`

Defined in: [types/stream.ts:440](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L440)

Audio transcription options for attached audio files (#413/#440).

Mirrors `GenerateOptions.audioOptions`. `stream()` spreads its options
rather than rebuilding them field by field, so declaring it here is what
lets it reach the message builder.

#### provider?

> `optional` **provider?**: `string`

Backend: "openai" (aliases "whisper"), "google" or "azure".

#### transcriptionModel?

> `optional` **transcriptionModel?**: `string`

Transcription model, e.g. "whisper-1". Backend-specific.

#### language?

> `optional` **language?**: `string`

Language hint, e.g. "en".

#### prompt?

> `optional` **prompt?**: `string`

Context prompt to bias transcription.

---

### tts?

> `optional` **tts?**: [`TTSOptions`](TTSOptions.md)

Defined in: [types/stream.ts:490](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L490)

Text-to-Speech (TTS) configuration for streaming

Enable audio generation from the streamed text response. Audio chunks will be
delivered through the stream alongside text chunks as TTSChunk objects.

#### Examples

```typescript
const result = await neurolink.stream({
  input: { text: "Tell me a story" },
  provider: "google-ai",
  tts: { enabled: true, voice: "en-US-Neural2-C" },
});

for await (const chunk of result.stream) {
  if (chunk.type === "text") {
    process.stdout.write(chunk.content);
  } else if (chunk.type === "tts_audio") {
    // Handle audio chunk
    playAudioChunk(chunk.audio.data);
  }
}
```

```typescript
const result = await neurolink.stream({
  input: { text: "Speak slowly" },
  provider: "google-ai",
  tts: {
    enabled: true,
    voice: "en-US-Neural2-D",
    speed: 0.8,
    format: "mp3",
    quality: "hd",
  },
});
```

---

### stt?

> `optional` **stt?**: [`STTOptions`](STTOptions.md) & `object`

Defined in: [types/stream.ts:497](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L497)

Speech-to-Text (STT) configuration for streaming

When enabled, audio from `stt.audio` is transcribed before streaming begins.

#### Type Declaration

##### provider?

> `optional` **provider?**: `string`

##### audio?

> `optional` **audio?**: `Buffer` \| `ArrayBuffer`

---

### thinkingConfig?

> `optional` **thinkingConfig?**: `object`

Defined in: [types/stream.ts:539](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L539)

Thinking/reasoning configuration for extended thinking models

Enables extended thinking capabilities for supported models.

**Gemini 3 Models** (gemini-3.1-pro-preview, gemini-3-flash-preview):
Use `thinkingLevel` to control reasoning depth:

- `minimal` - Near-zero thinking (Flash only)
- `low` - Fast reasoning for simple tasks
- `medium` - Balanced reasoning/latency
- `high` - Maximum reasoning depth (default for Pro)

**Anthropic Claude** (claude-3-7-sonnet, etc.):
Use `budgetTokens` to set token budget for thinking.

#### enabled?

> `optional` **enabled?**: `boolean`

#### type?

> `optional` **type?**: `"enabled"` \| `"disabled"`

#### budgetTokens?

> `optional` **budgetTokens?**: `number`

Token budget for thinking (Anthropic models)

#### thinkingLevel?

> `optional` **thinkingLevel?**: `"minimal"` \| `"low"` \| `"medium"` \| `"high"`

Thinking level for Gemini 3 models: minimal, low, medium, high

#### Examples

```typescript
const result = await neurolink.stream({
  input: { text: "Solve this complex problem..." },
  provider: "google-ai",
  model: "gemini-3.1-pro-preview",
  thinkingConfig: {
    thinkingLevel: "high",
  },
});
```

```typescript
const result = await neurolink.stream({
  input: { text: "Solve this complex math problem..." },
  provider: "anthropic",
  model: "claude-3-7-sonnet-20250219",
  thinkingConfig: {
    enabled: true,
    budgetTokens: 10000,
  },
});
```

---

### provider?

> `optional` **provider?**: [`AIProviderName`](../enumerations/AIProviderName.md) \| `string`

Defined in: [types/stream.ts:549](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L549)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/stream.ts:550](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L550)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/stream.ts:551](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L551)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/stream.ts:552](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L552)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/stream.ts:553](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L553)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/stream.ts:555](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L555)

Top-p (nucleus) sampling parameter. Controls diversity of generated tokens.

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/stream.ts:557](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L557)

Top-k sampling parameter. Limits the number of tokens considered. (Google/Gemini models only)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/stream.ts:559](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L559)

Stop sequences that will halt generation when encountered.

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/stream.ts:560](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L560)

---

### schema?

> `optional` **schema?**: [`ValidationSchema`](ValidationSchema.md)

Defined in: [types/stream.ts:561](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L561)

---

### tools?

> `optional` **tools?**: `Record`\<`string`, [`Tool`](Tool.md)\>

Defined in: [types/stream.ts:562](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L562)

---

### timeout?

> `optional` **timeout?**: `number` \| `string`

Defined in: [types/stream.ts:563](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L563)

---

### turnTimeoutMs?

> `optional` **turnTimeoutMs?**: `number`

Defined in: [types/stream.ts:565](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L565)

Wall-clock cap for the whole agentic turn (ms). See GenerateOptions.turnTimeoutMs.

---

### executionControl?

> `optional` **executionControl?**: [`ExecutionControlOptions`](ExecutionControlOptions.md)

Defined in: [types/stream.ts:592](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L592)

Opt-in execution policy for this turn (native Anthropic streaming only).
See ExecutionControlOptions. Absent means the legacy bounds apply
unchanged; present on any other provider is an error, not a no-op.

Two consequences of that "error, not a no-op" stance are worth knowing
before you set it:

- **It is incompatible with provider fallback.** Only the native Anthropic
  stream path implements the contract, so a turn that falls back to any
  other provider — internal fallback, or a configured fallback chain —
  fails there with a ValidationError instead of being served without the
  policy. That is deliberate: a fallback that silently dropped the policy
  would produce exactly the invisible ceiling this option exists to
  remove. Pair it with `disableInternalFallback: true` when you want the
  turn to stay on Anthropic, and handle the error if you do not.
- **It cannot be combined with `turnTimeoutMs`** when it sets
  `lifetimeTimeoutMs`, because both name the turn's wall-clock ceiling and
  only one of them can win. Supplying both is rejected up front rather
  than resolved in silence.
- **`lifetimeTimeoutMs: null` cannot be combined with
  `toolTimeoutMs: null`.** Removing the turn's ceiling leaves the per-tool
  deadline as the only thing that will ever end a tool which never
  returns; removing that as well leaves the turn with no bound anywhere.
  Also rejected up front.

---

### stallTimeoutMs?

> `optional` **stallTimeoutMs?**: `number`

Defined in: [types/stream.ts:594](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L594)

Max time with no progress before the turn ends as "stalled" (ms). Native Vertex loops only — see GenerateOptions.stallTimeoutMs.

---

### wrapupTimeLeadMs?

> `optional` **wrapupTimeLeadMs?**: `number`

Defined in: [types/stream.ts:596](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L596)

Remaining-time threshold that triggers the wrap-up nudge (ms). See GenerateOptions.wrapupTimeLeadMs.

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number` \| `null`

Defined in: [types/stream.ts:598](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L598)

Per-tool-execution timeout (ms, default 300_000; `null` for no bound). See GenerateOptions.toolTimeoutMs.

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/stream.ts:600](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L600)

AbortSignal for external cancellation of the AI call

---

### toolExecutionCapture?

> `optional` **toolExecutionCapture?**: [`ToolExecutionCaptureOptions`](ToolExecutionCaptureOptions.md)

Defined in: [types/stream.ts:602](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L602)

Bounds for tool execution capture. See GenerateOptions.toolExecutionCapture.

---

### disableTools?

> `optional` **disableTools?**: `boolean`

Defined in: [types/stream.ts:603](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L603)

---

### disableToolCallRepair?

> `optional` **disableToolCallRepair?**: `boolean`

Defined in: [types/stream.ts:605](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L605)

Disable the schema-driven tool call repair mechanism (BZ-665). Default: false (repair enabled).

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Defined in: [types/stream.ts:606](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L606)

---

### toolChoice?

> `optional` **toolChoice?**: [`ToolChoice`](ToolChoice.md)\<`Record`\<`string`, [`Tool`](Tool.md)\>\>

Defined in: [types/stream.ts:612](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L612)

Tool choice configuration for streaming generation.
Mirrors generate() so translated/fallback requests can preserve forced tool use.

---

### prepareStep?

> `optional` **prepareStep?**: (`options`) => `PromiseLike`\<\{ `toolChoice?`: [`ToolChoice`](ToolChoice.md)\<`Record`\<`string`, [`Tool`](Tool.md)\>\>; `activeTools?`: `Record`\<`string`, [`Tool`](Tool.md)\>; \} \| `undefined`\>

Defined in: [types/stream.ts:617](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L617)

Optional callback that runs before each stream step in a multi-step generation.

#### Parameters

##### options

###### steps

[`StepResult`](StepResult.md)\<`Record`\<`string`, [`Tool`](Tool.md)\>\>[]

###### stepNumber

`number`

###### maxSteps

`number`

###### model

[`LanguageModel`](LanguageModel.md)

#### Returns

`PromiseLike`\<\{ `toolChoice?`: [`ToolChoice`](ToolChoice.md)\<`Record`\<`string`, [`Tool`](Tool.md)\>\>; `activeTools?`: `Record`\<`string`, [`Tool`](Tool.md)\>; \} \| `undefined`\>

---

### toolFilter?

> `optional` **toolFilter?**: `string`[]

Defined in: [types/stream.ts:631](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L631)

Include only these tools by name (whitelist). If set, only matching tools are available.

---

### enabledToolNames?

> `optional` **enabledToolNames?**: `string`[]

Defined in: [types/stream.ts:638](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L638)

Filter available tools by name.
Used by dynamic arguments to dynamically select which tools to enable.
Merged into `toolFilter` before tool filtering runs.

---

### excludeTools?

> `optional` **excludeTools?**: `string`[]

Defined in: [types/stream.ts:641](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L641)

Exclude these tools by name (blacklist). Applied after toolFilter.

---

### disableToolCache?

> `optional` **disableToolCache?**: `boolean`

Defined in: [types/stream.ts:644](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L644)

Disable tool result caching for this request (overrides global mcp.cache.enabled)

---

### disableInternalFallback?

> `optional` **disableInternalFallback?**: `boolean`

Defined in: [types/stream.ts:650](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L650)

Disable NeuroLink's internal provider fallback for this request.
Used by the Claude proxy so the proxy itself can own fallback order.

---

### fallbackOnMaxSteps?

> `optional` **fallbackOnMaxSteps?**: `boolean`

Defined in: [types/stream.ts:662](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L662)

Whether a turn that ended at the caller's own `maxSteps` bound may still
trigger the internal no-output provider fallback. Reaching `maxSteps` is
a budget the caller set, not a provider failure, but such a turn can end
with no text output and would otherwise be retried on a different
provider — spending that provider's tokens because the caller's own
budget ran out. Set `false` to surface the capped turn as-is
(`metadata.stopReason === "step-cap"`). Default (unset/true) preserves
the existing fallback behaviour.

---

### skipToolPromptInjection?

> `optional` **skipToolPromptInjection?**: `boolean`

Defined in: [types/stream.ts:670](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L670)

Skip injecting tool schemas into the system prompt.
When true, tools are ONLY passed natively via the provider's `tools` parameter,
avoiding duplicate tool definitions (~30K tokens savings per call).
Default: false (backward compatible — tool schemas are injected into system prompt).

---

### enableEvaluation?

> `optional` **enableEvaluation?**: `boolean`

Defined in: [types/stream.ts:673](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L673)

---

### enableAnalytics?

> `optional` **enableAnalytics?**: `boolean`

Defined in: [types/stream.ts:674](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L674)

---

### context?

> `optional` **context?**: [`UnknownRecord`](UnknownRecord.md)

Defined in: [types/stream.ts:675](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L675)

---

### evaluationDomain?

> `optional` **evaluationDomain?**: `string`

Defined in: [types/stream.ts:678](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L678)

---

### toolUsageContext?

> `optional` **toolUsageContext?**: `string`

Defined in: [types/stream.ts:679](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L679)

---

### conversationHistory?

> `optional` **conversationHistory?**: `object`[]

Defined in: [types/stream.ts:680](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L680)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### factoryConfig?

> `optional` **factoryConfig?**: `object`

Defined in: [types/stream.ts:683](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L683)

#### domainType?

> `optional` **domainType?**: `string`

#### domainConfig?

> `optional` **domainConfig?**: [`StandardRecord`](StandardRecord.md)

#### enhancementType?

> `optional` **enhancementType?**: `"domain-configuration"` \| `"streaming-optimization"` \| `"mcp-integration"` \| `"legacy-migration"` \| `"context-conversion"`

#### preserveLegacyFields?

> `optional` **preserveLegacyFields?**: `boolean`

#### validateDomainData?

> `optional` **validateDomainData?**: `boolean`

---

### streaming?

> `optional` **streaming?**: `object`

Defined in: [types/stream.ts:697](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L697)

#### enabled?

> `optional` **enabled?**: `boolean`

#### chunkSize?

> `optional` **chunkSize?**: `number`

#### bufferSize?

> `optional` **bufferSize?**: `number`

#### enableProgress?

> `optional` **enableProgress?**: `boolean`

#### fallbackToGenerate?

> `optional` **fallbackToGenerate?**: `boolean`

---

### conversationMessages?

> `optional` **conversationMessages?**: [`ChatMessage`](ChatMessage.md)[]

Defined in: [types/stream.ts:706](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L706)

---

### middleware?

> `optional` **middleware?**: [`MiddlewareFactoryOptions`](MiddlewareFactoryOptions.md)

Defined in: [types/stream.ts:709](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L709)

---

### workflow?

> `optional` **workflow?**: `string`

Defined in: [types/stream.ts:712](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L712)

---

### workflowConfig?

> `optional` **workflowConfig?**: [`WorkflowConfig`](WorkflowConfig.md)

Defined in: [types/stream.ts:713](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L713)

---

### enableSummarization?

> `optional` **enableSummarization?**: `boolean`

Defined in: [types/stream.ts:715](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L715)

---

### maxBudgetUsd?

> `optional` **maxBudgetUsd?**: `number`

Defined in: [types/stream.ts:730](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L730)

Maximum cumulative cost (USD) for this session.
Once the session spend reaches this limit, subsequent stream() calls
will throw a SESSION_BUDGET_EXCEEDED error instead of making API calls.

#### Example

```typescript
const result = await neurolink.stream({
  input: { text: "Summarize this" },
  maxBudgetUsd: 1.0,
});
```

---

### rag?

> `optional` **rag?**: [`RAGConfig`](RAGConfig.md)

Defined in: [types/stream.ts:750](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L750)

RAG (Retrieval-Augmented Generation) configuration.

When provided, NeuroLink automatically loads the specified files, chunks them,
generates embeddings, and creates a search tool that the AI model can invoke
on demand to find relevant context before answering.

#### Example

```typescript
const stream = await neurolink.stream({
  input: { text: "What is RAG?" },
  provider: "vertex",
  rag: {
    files: ["./docs/guide.md"],
  },
});
```

---

### fallbackProvider?

> `optional` **fallbackProvider?**: `string`

Defined in: [types/stream.ts:763](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L763)

BZ-1341: Override fallback provider name (takes precedence over env/model config).

---

### fallbackModel?

> `optional` **fallbackModel?**: `string`

Defined in: [types/stream.ts:765](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L765)

BZ-1341: Override fallback model name (takes precedence over env/model config).

---

### onFinish?

> `optional` **onFinish?**: [`OnFinishCallback`](OnFinishCallback.md)

Defined in: [types/stream.ts:768](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L768)

Callback invoked when streaming completes successfully.

---

### onError?

> `optional` **onError?**: [`OnErrorCallback`](OnErrorCallback.md)

Defined in: [types/stream.ts:771](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L771)

Callback invoked when streaming encounters an error.

---

### onChunk?

> `optional` **onChunk?**: [`OnChunkCallback`](OnChunkCallback.md)

Defined in: [types/stream.ts:774](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L774)

Callback invoked for each streaming chunk.

---

### requestContext?

> `optional` **requestContext?**: `Record`\<`string`, `unknown`\>

Defined in: [types/stream.ts:777](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L777)

Pre-validated user context for the request

---

### auth?

> `optional` **auth?**: `object`

Defined in: [types/stream.ts:780](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L780)

Raw auth token — validated by configured auth provider

#### token

> **token**: `string`

---

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)

Defined in: [types/stream.ts:787](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L787)

Per-provider credential overrides for this request.
Overrides instance-level credentials set in `new NeuroLink({ credentials })`.
Unset providers fall through to instance credentials, then environment variables.

---

### providerFallback?

> `optional` **providerFallback?**: (`error`) => `Promise`\<\{ `provider?`: `string`; `model?`: `string`; \} \| `null`\>

Defined in: [types/stream.ts:799](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L799)

Curator P2-3: per-call fallback callback. Overrides any
instance-level `providerFallback` set on `new NeuroLink({...})`.
Invoked for any error thrown while establishing the stream, except a
genuine caller cancel — i.e. this call's `abortSignal` fired (network
errors, 5xx, timeouts, auth failures, model-access-denied, and
internal watchdog aborts all invoke it); receives the error
unmodified. There is no mid-stream resume once chunks are flowing.
Return `{ provider, model }` to retry, `null` to bubble.

#### Parameters

##### error

`unknown`

#### Returns

`Promise`\<\{ `provider?`: `string`; `model?`: `string`; \} \| `null`\>

---

### modelChain?

> `optional` **modelChain?**: `string`[]

Defined in: [types/stream.ts:809](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L809)

Curator P2-3: per-call ordered model chain. Overrides any
instance-level `modelChain`. Without an explicit `providerFallback`
callback the chain only advances on model-access-denied errors —
other failures (network, 5xx, timeouts) bubble immediately.

---

### memory?

> `optional` **memory?**: `object`

Defined in: [types/stream.ts:818](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L818)

Per-call memory control.

Override the global memory SDK behavior for this specific call.
All flags default to `true` when the global memory SDK is enabled.
If the global memory SDK is disabled, these flags have no effect.

#### enabled?

> `optional` **enabled?**: `boolean`

Master toggle for this call. When false, both read and write are skipped. Defaults to true.

#### read?

> `optional` **read?**: `boolean`

Whether to read condensed memory and prepend to prompt. Defaults to true.

#### write?

> `optional` **write?**: `boolean`

Whether to write (add/condense) the conversation into memory after completion. Defaults to true.

#### additionalUsers?

> `optional` **additionalUsers?**: [`AdditionalMemoryUser`](AdditionalMemoryUser.md)[]

Additional users whose memory should be retrieved/stored alongside the primary user.
Each entry can override the condensation prompt and maxWords for that user.
Primary user is still determined by context.userId.

---

### piiDetection?

> `optional` **piiDetection?**: `object`

Defined in: [types/stream.ts:834](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L834)

PII detection — scans and optionally redacts PII from input before the LLM call.

#### enabled?

> `optional` **enabled?**: `boolean`

#### action?

> `optional` **action?**: `"redact"` \| `"abort"` \| `"warn"`

#### detectTypes?

> `optional` **detectTypes?**: (`"email"` \| `"phone"` \| `"ssn"` \| `"creditCard"` \| `"ipAddress"` \| `"address"` \| `"name"` \| `"dateOfBirth"` \| `"passport"` \| `"driversLicense"`)[]

#### customPatterns?

> `optional` **customPatterns?**: `RegExp`[]

#### allowList?

> `optional` **allowList?**: `string`[]

#### redactionText?

> `optional` **redactionText?**: `string`

---

### responseValidation?

> `optional` **responseValidation?**: `object`

Defined in: [types/stream.ts:855](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L855)

Response validation — validates accumulated stream content after completion.

#### minLength?

> `optional` **minLength?**: `number`

#### maxLength?

> `optional` **maxLength?**: `number`

#### requiredPhrases?

> `optional` **requiredPhrases?**: `string`[]

#### forbiddenPhrases?

> `optional` **forbiddenPhrases?**: `string`[]

#### jsonSchema?

> `optional` **jsonSchema?**: `Record`\<`string`, `unknown`\>

#### customValidator?

> `optional` **customValidator?**: (`text`) => \{ `category`: `string`; `severity`: `"error"` \| `"warning"` \| `"info"`; `message`: `string`; \} \| `null`

##### Parameters

###### text

`string`

##### Returns

\{ `category`: `string`; `severity`: `"error"` \| `"warning"` \| `"info"`; `message`: `string`; \} \| `null`

#### truncationAction?

> `optional` **truncationAction?**: `"abort"` \| `"retry"` \| `"truncate"` \| `"warn"`

#### truncationSuffix?

> `optional` **truncationSuffix?**: `string`

#### retryOnFailure?

> `optional` **retryOnFailure?**: `boolean`

#### maxRetries?

> `optional` **maxRetries?**: `number`

---

### inputValidation?

> `optional` **inputValidation?**: `object`

Defined in: [types/stream.ts:873](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L873)

Input validation — validates input text before any processing.

#### trimWhitespace?

> `optional` **trimWhitespace?**: `boolean`

#### minLength?

> `optional` **minLength?**: `number`

#### maxLength?

> `optional` **maxLength?**: `number`

#### requireContent?

> `optional` **requireContent?**: `boolean`

---

### ~~processors?~~

> `optional` **processors?**: [`ProcessorPipelineConfig`](ProcessorPipelineConfig.md)

Defined in: [types/stream.ts:881](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L881)

#### Deprecated

Use `piiDetection`, `responseValidation`, and `inputValidation` instead.

---

### skills?

> `optional` **skills?**: [`SkillsCallOptions`](SkillsCallOptions.md)

Defined in: [types/stream.ts:889](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L889)

Per-call skills control. Only effective when the instance was
constructed with `skills.enabled: true`. Lets a call disable the
prompt index, or narrow it by scope/tags. Per-call wins over
instance config.
