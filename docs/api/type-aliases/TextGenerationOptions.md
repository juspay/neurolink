[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextGenerationOptions

# Type Alias: TextGenerationOptions

> **TextGenerationOptions** = `object`

Defined in: [types/generate.ts:1243](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1243)

Text generation options type (consolidated from core types)
Extended to support video generation mode

## Properties

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/generate.ts:1244](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1244)

---

### input?

> `optional` **input?**: `object`

Defined in: [types/generate.ts:1254](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1254)

Alternative input format for multimodal SDK operations.

NOTE: This field is only used by the higher-level `generate()` API
(NeuroLink.generate, BaseProvider.generate). Legacy `generateText()`
callers must still use the `prompt` field directly.

Supports text, images, and other multimodal inputs.

#### text?

> `optional` **text?**: `string`

Prompt text. Optional for media-only modes (avatar, music) that are driven by uploaded files rather than a prompt.

#### images?

> `optional` **images?**: (`Buffer` \| `string` \| [`ImageWithAltText`](ImageWithAltText.md))[]

Images to include in the request.
For video generation, the first image is used as the source frame.

#### pdfFiles?

> `optional` **pdfFiles?**: (`Buffer` \| `string`)[]

#### csvFiles?

> `optional` **csvFiles?**: (`Buffer` \| `string`)[]

CSV files to inline as tabular text, with tool instructions appended.

Declared here because `processExplicitCsvFiles` has always read it and
the internal `GenerateOptions` has always carried it — it was missing
only from the public type, so callers reaching the shipped behaviour had
to widen the type themselves to do it.

#### files?

> `optional` **files?**: (`Buffer` \| `string` \| [`FileWithMetadata`](FileWithMetadata.md))[]

#### segments?

> `optional` **segments?**: [`DirectorSegment`](DirectorSegment.md)[]

Director Mode segments (2-10). When provided, Director Mode is activated.

---

### provider?

> `optional` **provider?**: [`AIProviderName`](../enumerations/AIProviderName.md)

Defined in: [types/generate.ts:1276](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1276)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/generate.ts:1277](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1277)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/generate.ts:1278](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1278)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/generate.ts:1279](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1279)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/generate.ts:1280](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1280)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/generate.ts:1282](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1282)

Top-p (nucleus) sampling parameter. Controls diversity of generated tokens.

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/generate.ts:1284](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1284)

Top-k sampling parameter. Limits the number of tokens considered. (Google/Gemini models only)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/generate.ts:1286](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1286)

Stop sequences that will halt generation when encountered.

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/generate.ts:1287](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1287)

---

### schema?

> `optional` **schema?**: [`ZodUnknownSchema`](ZodUnknownSchema.md) \| [`Schema`](Schema.md)\<`unknown`\>

Defined in: [types/generate.ts:1288](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1288)

---

### output?

> `optional` **output?**: `object`

Defined in: [types/generate.ts:1300](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1300)

Output configuration options

#### format?

> `optional` **format?**: `"text"` \| `"structured"` \| `"json"`

#### mode?

> `optional` **mode?**: `"text"` \| `"video"` \| `"ppt"` \| `"avatar"` \| `"music"`

Output mode - determines the type of content generated

- "text": Standard text generation (default)
- "video": Video generation using models like Veo 3.1
- "ppt": PowerPoint presentation generation
- "avatar": Talking-head / lip-sync video (D-ID, HeyGen, Replicate-MuseTalk)
- "music": Music / sound generation (Beatoven, ElevenLabs Music, Lyria, Replicate)

#### video?

> `optional` **video?**: [`VideoOutputOptions`](VideoOutputOptions.md)

Video generation configuration (used when mode is "video")

#### ppt?

> `optional` **ppt?**: [`PPTOutputOptions`](PPTOutputOptions.md)

PowerPoint generation configuration (used when mode is "ppt")

#### director?

> `optional` **director?**: [`DirectorModeOptions`](DirectorModeOptions.md)

Director Mode configuration (only used when input.segments is provided)

#### avatar?

> `optional` **avatar?**: [`AvatarOptions`](AvatarOptions.md)

Avatar generation configuration (used when mode is "avatar")

#### music?

> `optional` **music?**: [`MusicOptions`](MusicOptions.md)

Music generation configuration (used when mode is "music")

#### Example

```typescript
output: {
  mode: "video",
  video: { resolution: "1080p", length: 8 }
}
```

---

### tools?

> `optional` **tools?**: `Record`\<`string`, [`Tool`](Tool.md)\>

Defined in: [types/generate.ts:1332](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1332)

---

### enabledToolNames?

> `optional` **enabledToolNames?**: `string`[]

Defined in: [types/generate.ts:1347](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1347)

Filter available tools by name.
Only tools with names in this array will be made available.
Used by dynamic arguments to dynamically select which tools to enable.
Merged into `toolFilter` before tool filtering runs.

#### Example

```typescript
await neurolink.generate({
  input: { text: "Search for information" },
  enabledToolNames: ["websearchGrounding", "readFile"],
});
```

---

### timeout?

> `optional` **timeout?**: `number` \| `string`

Defined in: [types/generate.ts:1348](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1348)

---

### turnTimeoutMs?

> `optional` **turnTimeoutMs?**: `number`

Defined in: [types/generate.ts:1350](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1350)

Wall-clock cap for the whole agentic turn (ms). See GenerateOptions.turnTimeoutMs.

---

### stallTimeoutMs?

> `optional` **stallTimeoutMs?**: `number`

Defined in: [types/generate.ts:1352](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1352)

Max time with no progress before the turn ends as "stalled" (ms). See GenerateOptions.stallTimeoutMs.

---

### wrapupTimeLeadMs?

> `optional` **wrapupTimeLeadMs?**: `number`

Defined in: [types/generate.ts:1354](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1354)

Remaining-time threshold that triggers the wrap-up nudge (ms). See GenerateOptions.wrapupTimeLeadMs.

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number` \| `null`

Defined in: [types/generate.ts:1356](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1356)

Per-tool-execution timeout (ms, default 300_000; `null` for no bound). See GenerateOptions.toolTimeoutMs.

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/generate.ts:1358](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1358)

AbortSignal for external cancellation of the AI call

---

### toolExecutionCapture?

> `optional` **toolExecutionCapture?**: [`ToolExecutionCaptureOptions`](ToolExecutionCaptureOptions.md)

Defined in: [types/generate.ts:1360](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1360)

Bounds for tool execution capture. See GenerateOptions.toolExecutionCapture.

---

### disableTools?

> `optional` **disableTools?**: `boolean`

Defined in: [types/generate.ts:1368](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1368)

---

### disableToolCallRepair?

> `optional` **disableToolCallRepair?**: `boolean`

Defined in: [types/generate.ts:1370](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1370)

Disable the schema-driven tool call repair mechanism (BZ-665). Default: false (repair enabled).

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Defined in: [types/generate.ts:1371](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1371)

---

### toolFilter?

> `optional` **toolFilter?**: `string`[]

Defined in: [types/generate.ts:1374](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1374)

Include only these tools by name (whitelist). If set, only matching tools are available.

---

### excludeTools?

> `optional` **excludeTools?**: `string`[]

Defined in: [types/generate.ts:1377](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1377)

Exclude these tools by name (blacklist). Applied after toolFilter.

---

### disableToolCache?

> `optional` **disableToolCache?**: `boolean`

Defined in: [types/generate.ts:1380](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1380)

Disable tool result caching for this request (overrides global mcp.cache.enabled)

---

### disableInternalFallback?

> `optional` **disableInternalFallback?**: `boolean`

Defined in: [types/generate.ts:1389](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1389)

Caller owns fallback order. Read in two places: `directProviderGeneration`
bounds its static provider-priority walk to one candidate, and
`BaseProvider.generate()` skips the catalog model-fallback walk so an
invalid-model error surfaces as itself. Mapped from
`GenerateOptions.disableInternalFallback`.

---

### toolChoice?

> `optional` **toolChoice?**: [`ToolChoice`](ToolChoice.md)\<`Record`\<`string`, [`Tool`](Tool.md)\>\>

Defined in: [types/generate.ts:1404](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1404)

Tool choice configuration for the generation.
Controls whether and which tools the model must call.

- `"auto"` (default): the model can choose whether and which tools to call
- `"none"`: no tool calls allowed
- `"required"`: the model must call at least one tool
- `{ type: "tool", toolName: string }`: the model must call the specified tool

Note: When used without `prepareStep`, this applies to **every step** in the
`maxSteps` loop. Using `"required"` or `{ type: "tool" }` without `prepareStep`
will cause infinite tool calls until `maxSteps` is exhausted.

---

### prepareStep?

> `optional` **prepareStep?**: (`options`) => `PromiseLike`\<\{ `model?`: [`LanguageModel`](LanguageModel.md); `toolChoice?`: [`ToolChoice`](ToolChoice.md)\<`Record`\<`string`, [`Tool`](Tool.md)\>\>; `experimental_activeTools?`: `string`[]; \} \| `undefined`\>

Defined in: [types/generate.ts:1429](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1429)

Optional callback that runs before each step in a multi-step generation.
Allows dynamically changing `toolChoice` and available tools per step.

This is the recommended way to enforce specific tool calls on certain steps
while allowing the model freedom on others.

Maps to Vercel AI SDK's `experimental_prepareStep`.

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

`PromiseLike`\<\{ `model?`: [`LanguageModel`](LanguageModel.md); `toolChoice?`: [`ToolChoice`](ToolChoice.md)\<`Record`\<`string`, [`Tool`](Tool.md)\>\>; `experimental_activeTools?`: `string`[]; \} \| `undefined`\>

#### Example

```typescript
prepareStep: ({ stepNumber, steps }) => {
  if (stepNumber === 0) {
    return {
      toolChoice: { type: "tool", toolName: "myTool" },
    };
  }
  return { toolChoice: "auto" };
};
```

#### See

https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text#parameters

---

### tts?

> `optional` **tts?**: [`TTSOptions`](TTSOptions.md)

Defined in: [types/generate.ts:1472](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1472)

Text-to-Speech (TTS) configuration

Enable audio generation from text. Behavior depends on useAiResponse flag:

- When useAiResponse is false/undefined (default): TTS synthesizes the input text directly
- When useAiResponse is true: TTS synthesizes the AI-generated response

#### Examples

```typescript
const neurolink = new NeuroLink();
const result = await neurolink.generate({
  input: { text: "Hello world" },
  provider: "google-ai",
  tts: { enabled: true, voice: "en-US-Neural2-C" },
});
// TTS synthesizes "Hello world" directly, no AI generation
```

```typescript
const neurolink = new NeuroLink();
const result = await neurolink.generate({
  input: { text: "Tell me a joke" },
  provider: "google-ai",
  tts: { enabled: true, useAiResponse: true, voice: "en-US-Neural2-C" },
});
// AI generates the joke, then TTS synthesizes the AI's response
```

---

### stt?

> `optional` **stt?**: [`STTOptions`](STTOptions.md) & `object`

Defined in: [types/generate.ts:1491](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1491)

Speech-to-Text (STT) configuration

Enable audio transcription. When enabled, the audio provided via `stt.audio`
will be transcribed to text and used as the prompt.

#### Type Declaration

##### provider?

> `optional` **provider?**: `string`

##### audio?

> `optional` **audio?**: `Buffer` \| `ArrayBuffer`

#### Example

```typescript
const neurolink = new NeuroLink();
const result = await neurolink.generate({
  input: { text: "" },
  provider: "openai",
  stt: {
    enabled: true,
    provider: "whisper",
    language: "en-US",
    audio: audioBuffer,
  },
});
// STT transcribes the audio, result.transcription contains the transcription
```

---

### enableEvaluation?

> `optional` **enableEvaluation?**: `boolean`

Defined in: [types/generate.ts:1494](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1494)

---

### enableAnalytics?

> `optional` **enableAnalytics?**: `boolean`

Defined in: [types/generate.ts:1495](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1495)

---

### context?

> `optional` **context?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/generate.ts:1496](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1496)

---

### evaluationDomain?

> `optional` **evaluationDomain?**: `string`

Defined in: [types/generate.ts:1499](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1499)

---

### toolUsageContext?

> `optional` **toolUsageContext?**: `string`

Defined in: [types/generate.ts:1500](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1500)

---

### conversationHistory?

> `optional` **conversationHistory?**: `object`[]

Defined in: [types/generate.ts:1501](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1501)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### conversationMessages?

> `optional` **conversationMessages?**: [`ChatMessage`](ChatMessage.md)[]

Defined in: [types/generate.ts:1504](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1504)

---

### conversationMemoryConfig?

> `optional` **conversationMemoryConfig?**: `Partial`\<[`ConversationMemoryConfig`](ConversationMemoryConfig.md)\>

Defined in: [types/generate.ts:1507](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1507)

---

### originalPrompt?

> `optional` **originalPrompt?**: `string`

Defined in: [types/generate.ts:1508](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1508)

---

### middleware?

> `optional` **middleware?**: [`MiddlewareFactoryOptions`](MiddlewareFactoryOptions.md)

Defined in: [types/generate.ts:1511](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1511)

---

### onFinish?

> `optional` **onFinish?**: [`OnFinishCallback`](OnFinishCallback.md)

Defined in: [types/generate.ts:1519](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1519)

---

### onError?

> `optional` **onError?**: [`OnErrorCallback`](OnErrorCallback.md)

Defined in: [types/generate.ts:1520](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1520)

---

### expectedOutcome?

> `optional` **expectedOutcome?**: `string`

Defined in: [types/generate.ts:1523](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1523)

---

### evaluationCriteria?

> `optional` **evaluationCriteria?**: `string`[]

Defined in: [types/generate.ts:1524](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1524)

---

### csvOptions?

> `optional` **csvOptions?**: [`CSVProcessorOptions`](CSVProcessorOptions.md)

Defined in: [types/generate.ts:1527](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1527)

---

### pdfOptions?

> `optional` **pdfOptions?**: `object`

Defined in: [types/generate.ts:1530](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1530)

PDF processing options (#258).

#### password?

> `optional` **password?**: `string`

Password for an encrypted PDF (image-conversion fallback path).

#### maxCanvasPixels?

> `optional` **maxCanvasPixels?**: `number`

Max rendered-canvas pixels per page (#260 memory guard); oversized pages auto-downscale.

#### scale?

> `optional` **scale?**: `number`

Render scale for the image fallback (#297); defaults to PDF_LIMITS.DEFAULT_SCALE.

#### maxPages?

> `optional` **maxPages?**: `number`

Max pages converted by the image fallback (#297); defaults to PDF_LIMITS.DEFAULT_MAX_PAGES.

---

### videoOptions?

> `optional` **videoOptions?**: `object`

Defined in: [types/generate.ts:1546](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1546)

Video processing options (mirrors `GenerateOptions.videoOptions`). Never
declared here before, so `buildGenerateTextOptions` had nowhere to
forward the caller's setting even once the allowlist itself named it.

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

### enableSummarization?

> `optional` **enableSummarization?**: `boolean`

Defined in: [types/generate.ts:1557](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1557)

---

### skipToolPromptInjection?

> `optional` **skipToolPromptInjection?**: `boolean`

Defined in: [types/generate.ts:1575](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1575)

Skip injecting tool schemas into the system prompt.
When true, tools are ONLY passed natively via the provider's `tools` parameter,
avoiding duplicate tool definitions (~30K tokens savings per call).
Default: false (backward compatible — tool schemas are injected into system prompt).

---

### thinking?

> `optional` **thinking?**: `boolean`

Defined in: [types/generate.ts:1641](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1641)

Enable extended thinking capability (simplified option).
Equivalent to `thinkingConfig.enabled = true`.
Works with both Anthropic and Gemini 3 models.

---

### thinkingBudget?

> `optional` **thinkingBudget?**: `number`

Defined in: [types/generate.ts:1648](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1648)

Token budget for thinking (Anthropic models only).
Equivalent to `thinkingConfig.budgetTokens`.
Range: 5000-100000 tokens. Ignored for Gemini models.

---

### thinkingLevel?

> `optional` **thinkingLevel?**: `"minimal"` \| `"low"` \| `"medium"` \| `"high"`

Defined in: [types/generate.ts:1659](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1659)

Thinking level for Gemini 3 models only.
Equivalent to `thinkingConfig.thinkingLevel`.

- `minimal` - Near-zero thinking (Flash only)
- `low` - Light reasoning
- `medium` - Balanced reasoning/latency
- `high` - Deep reasoning (Pro default)
  Ignored for Anthropic models.

---

### thinkingConfig?

> `optional` **thinkingConfig?**: `object`

Defined in: [types/generate.ts:1667](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1667)

Full thinking/reasoning configuration (recommended for SDK usage).
Takes precedence over simplified options (thinking, thinkingBudget, thinkingLevel).

#### enabled?

> `optional` **enabled?**: `boolean`

Enable extended thinking. Default: false

#### type?

> `optional` **type?**: `"enabled"` \| `"disabled"`

Explicit enable/disable type. Alternative to `enabled` boolean.

#### budgetTokens?

> `optional` **budgetTokens?**: `number`

Token budget for thinking (Anthropic: 5000-100000). Ignored for Gemini.

#### thinkingLevel?

> `optional` **thinkingLevel?**: `"minimal"` \| `"low"` \| `"medium"` \| `"high"`

Thinking level (Gemini 3: minimal|low|medium|high). Ignored for Anthropic.

#### See

Above documentation for provider-specific behavior and option compatibility.

---

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)

Defined in: [types/generate.ts:1683](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1683)

Per-provider credential overrides for this request.
Overrides instance-level credentials set in `new NeuroLink({ credentials })`.
Unset providers fall through to instance credentials, then environment variables.

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/generate.ts:1690](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1690)

Optional request identifier for observability and log correlation.
When provided, this ID is forwarded to spans, logs, and telemetry so
callers can correlate generation traces back to their own request lifecycle.

---

### piiDetection?

> `optional` **piiDetection?**: [`GenerateOptions`](GenerateOptions.md)\[`"piiDetection"`\]

Defined in: [types/generate.ts:1693](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1693)

PII detection config — forwarded from GenerateOptions/StreamOptions.

---

### responseValidation?

> `optional` **responseValidation?**: [`GenerateOptions`](GenerateOptions.md)\[`"responseValidation"`\]

Defined in: [types/generate.ts:1696](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1696)

Response validation config — forwarded from GenerateOptions/StreamOptions.

---

### inputValidation?

> `optional` **inputValidation?**: [`GenerateOptions`](GenerateOptions.md)\[`"inputValidation"`\]

Defined in: [types/generate.ts:1699](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1699)

Input validation config — forwarded from GenerateOptions/StreamOptions.

---

### ~~processors?~~

> `optional` **processors?**: [`ProcessorPipelineConfig`](ProcessorPipelineConfig.md)

Defined in: [types/generate.ts:1702](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1702)

#### Deprecated

Use `piiDetection`, `responseValidation`, `inputValidation` instead.
