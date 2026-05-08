[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamOptions

# Type Alias: StreamOptions

> **StreamOptions** = `object`

Defined in: [types/stream.ts:212](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L212)

## Properties

### input

> **input**: `object`

Defined in: [types/stream.ts:213](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L213)

#### text

> **text**: `string`

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

#### videoFiles?

> `optional` **videoFiles?**: (`Buffer` \| `string`)[]

#### files?

> `optional` **files?**: (`Buffer` \| `string` \| [`FileWithMetadata`](FileWithMetadata.md))[]

#### content?

> `optional` **content?**: [`Content`](Content.md)[]

---

### output?

> `optional` **output?**: `object`

Defined in: [types/stream.ts:240](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L240)

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

> `optional` **csvOptions?**: `object`

Defined in: [types/stream.ts:250](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L250)

#### maxRows?

> `optional` **maxRows?**: `number`

#### formatStyle?

> `optional` **formatStyle?**: `"raw"` \| `"markdown"` \| `"json"`

#### includeHeaders?

> `optional` **includeHeaders?**: `boolean`

---

### videoOptions?

> `optional` **videoOptions?**: `object`

Defined in: [types/stream.ts:257](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L257)

#### frames?

> `optional` **frames?**: `number`

#### quality?

> `optional` **quality?**: `number`

#### format?

> `optional` **format?**: `"jpeg"` \| `"png"`

#### transcribeAudio?

> `optional` **transcribeAudio?**: `boolean`

---

### tts?

> `optional` **tts?**: [`TTSOptions`](TTSOptions.md)

Defined in: [types/stream.ts:303](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L303)

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

Defined in: [types/stream.ts:310](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L310)

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

Defined in: [types/stream.ts:352](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L352)

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

Defined in: [types/stream.ts:362](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L362)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/stream.ts:363](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L363)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/stream.ts:364](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L364)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/stream.ts:365](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L365)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/stream.ts:366](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L366)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/stream.ts:367](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L367)

---

### schema?

> `optional` **schema?**: [`ValidationSchema`](ValidationSchema.md)

Defined in: [types/stream.ts:368](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L368)

---

### tools?

> `optional` **tools?**: `Record`\<`string`, `Tool`\>

Defined in: [types/stream.ts:369](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L369)

---

### timeout?

> `optional` **timeout?**: `number` \| `string`

Defined in: [types/stream.ts:370](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L370)

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/stream.ts:372](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L372)

AbortSignal for external cancellation of the AI call

---

### disableTools?

> `optional` **disableTools?**: `boolean`

Defined in: [types/stream.ts:373](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L373)

---

### disableToolCallRepair?

> `optional` **disableToolCallRepair?**: `boolean`

Defined in: [types/stream.ts:375](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L375)

Disable the schema-driven tool call repair mechanism (BZ-665). Default: false (repair enabled).

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Defined in: [types/stream.ts:376](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L376)

---

### toolChoice?

> `optional` **toolChoice?**: `ToolChoice`\<`Record`\<`string`, `Tool`\>\>

Defined in: [types/stream.ts:382](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L382)

Tool choice configuration for streaming generation.
Mirrors generate() so translated/fallback requests can preserve forced tool use.

---

### prepareStep?

> `optional` **prepareStep?**: (`options`) => `PromiseLike`\<\{ `toolChoice?`: `ToolChoice`\<`Record`\<`string`, `Tool`\>\>; `activeTools?`: `Record`\<`string`, `Tool`\>; \} \| `undefined`\>

Defined in: [types/stream.ts:387](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L387)

Optional callback that runs before each stream step in a multi-step generation.

#### Parameters

##### options

###### steps

`StepResult`\<`Record`\<`string`, `Tool`\>\>[]

###### stepNumber

`number`

###### maxSteps

`number`

###### model

`LanguageModel`

#### Returns

`PromiseLike`\<\{ `toolChoice?`: `ToolChoice`\<`Record`\<`string`, `Tool`\>\>; `activeTools?`: `Record`\<`string`, `Tool`\>; \} \| `undefined`\>

---

### toolFilter?

> `optional` **toolFilter?**: `string`[]

Defined in: [types/stream.ts:401](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L401)

Include only these tools by name (whitelist). If set, only matching tools are available.

---

### enabledToolNames?

> `optional` **enabledToolNames?**: `string`[]

Defined in: [types/stream.ts:408](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L408)

Filter available tools by name.
Used by dynamic arguments to dynamically select which tools to enable.
Merged into `toolFilter` before tool filtering runs.

---

### excludeTools?

> `optional` **excludeTools?**: `string`[]

Defined in: [types/stream.ts:411](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L411)

Exclude these tools by name (blacklist). Applied after toolFilter.

---

### disableToolCache?

> `optional` **disableToolCache?**: `boolean`

Defined in: [types/stream.ts:414](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L414)

Disable tool result caching for this request (overrides global mcp.cache.enabled)

---

### disableInternalFallback?

> `optional` **disableInternalFallback?**: `boolean`

Defined in: [types/stream.ts:420](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L420)

Disable NeuroLink's internal provider fallback for this request.
Used by the Claude proxy so the proxy itself can own fallback order.

---

### skipToolPromptInjection?

> `optional` **skipToolPromptInjection?**: `boolean`

Defined in: [types/stream.ts:428](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L428)

Skip injecting tool schemas into the system prompt.
When true, tools are ONLY passed natively via the provider's `tools` parameter,
avoiding duplicate tool definitions (~30K tokens savings per call).
Default: false (backward compatible — tool schemas are injected into system prompt).

---

### enableEvaluation?

> `optional` **enableEvaluation?**: `boolean`

Defined in: [types/stream.ts:431](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L431)

---

### enableAnalytics?

> `optional` **enableAnalytics?**: `boolean`

Defined in: [types/stream.ts:432](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L432)

---

### context?

> `optional` **context?**: [`UnknownRecord`](UnknownRecord.md)

Defined in: [types/stream.ts:433](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L433)

---

### evaluationDomain?

> `optional` **evaluationDomain?**: `string`

Defined in: [types/stream.ts:436](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L436)

---

### toolUsageContext?

> `optional` **toolUsageContext?**: `string`

Defined in: [types/stream.ts:437](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L437)

---

### conversationHistory?

> `optional` **conversationHistory?**: `object`[]

Defined in: [types/stream.ts:438](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L438)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### factoryConfig?

> `optional` **factoryConfig?**: `object`

Defined in: [types/stream.ts:441](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L441)

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

Defined in: [types/stream.ts:455](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L455)

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

Defined in: [types/stream.ts:464](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L464)

---

### middleware?

> `optional` **middleware?**: [`MiddlewareFactoryOptions`](MiddlewareFactoryOptions.md)

Defined in: [types/stream.ts:467](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L467)

---

### workflow?

> `optional` **workflow?**: `string`

Defined in: [types/stream.ts:470](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L470)

---

### workflowConfig?

> `optional` **workflowConfig?**: [`WorkflowConfig`](WorkflowConfig.md)

Defined in: [types/stream.ts:471](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L471)

---

### enableSummarization?

> `optional` **enableSummarization?**: `boolean`

Defined in: [types/stream.ts:473](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L473)

---

### maxBudgetUsd?

> `optional` **maxBudgetUsd?**: `number`

Defined in: [types/stream.ts:488](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L488)

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

Defined in: [types/stream.ts:508](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L508)

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

Defined in: [types/stream.ts:521](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L521)

BZ-1341: Override fallback provider name (takes precedence over env/model config).

---

### fallbackModel?

> `optional` **fallbackModel?**: `string`

Defined in: [types/stream.ts:523](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L523)

BZ-1341: Override fallback model name (takes precedence over env/model config).

---

### onFinish?

> `optional` **onFinish?**: [`OnFinishCallback`](OnFinishCallback.md)

Defined in: [types/stream.ts:526](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L526)

Callback invoked when streaming completes successfully.

---

### onError?

> `optional` **onError?**: [`OnErrorCallback`](OnErrorCallback.md)

Defined in: [types/stream.ts:529](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L529)

Callback invoked when streaming encounters an error.

---

### onChunk?

> `optional` **onChunk?**: [`OnChunkCallback`](OnChunkCallback.md)

Defined in: [types/stream.ts:532](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L532)

Callback invoked for each streaming chunk.

---

### requestContext?

> `optional` **requestContext?**: `Record`\<`string`, `unknown`\>

Defined in: [types/stream.ts:535](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L535)

Pre-validated user context for the request

---

### auth?

> `optional` **auth?**: `object`

Defined in: [types/stream.ts:538](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L538)

Raw auth token — validated by configured auth provider

#### token

> **token**: `string`

---

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)

Defined in: [types/stream.ts:545](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L545)

Per-provider credential overrides for this request.
Overrides instance-level credentials set in `new NeuroLink({ credentials })`.
Unset providers fall through to instance credentials, then environment variables.

---

### providerFallback?

> `optional` **providerFallback?**: (`error`) => `Promise`\<\{ `provider?`: `string`; `model?`: `string`; \} \| `null`\>

Defined in: [types/stream.ts:551](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L551)

Curator P2-3: per-call fallback callback. Overrides any
instance-level `providerFallback` set on `new NeuroLink({...})`.

#### Parameters

##### error

`unknown`

#### Returns

`Promise`\<\{ `provider?`: `string`; `model?`: `string`; \} \| `null`\>

---

### modelChain?

> `optional` **modelChain?**: `string`[]

Defined in: [types/stream.ts:559](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L559)

Curator P2-3: per-call ordered model chain. Overrides any
instance-level `modelChain`. Tried in order on model-access-denied.

---

### memory?

> `optional` **memory?**: `object`

Defined in: [types/stream.ts:568](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L568)

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
