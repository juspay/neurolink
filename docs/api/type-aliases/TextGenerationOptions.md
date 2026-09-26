[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextGenerationOptions

# Type Alias: TextGenerationOptions

> **TextGenerationOptions** = `object`

Defined in: [types/generate.ts:1334](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1334)

Text generation options type (consolidated from core types)
Extended to support video generation mode

## Properties

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/generate.ts:1335](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1335)

---

### compactionThreshold?

> `optional` **compactionThreshold?**: `number`

Defined in: [types/generate.ts:1348](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1348)

Fraction of the model's context window at which compaction runs for this
request, replacing the 0.8 default.

A request that needs only the current message does not need the whole
window kept warm for it, and compacting earlier is free; a request that
depends on the entire conversation should compact as late as possible.
When the classifier router runs with a decision model it fills this in
per request — always at or below the default, never above, because a
request that overflows the window fails hard and `ModelPool` records that
failure as a permanent cooldown.

---

### input?

> `optional` **input?**: `object`

Defined in: [types/generate.ts:1358](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1358)

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

Defined in: [types/generate.ts:1380](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1380)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/generate.ts:1381](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1381)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/generate.ts:1382](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1382)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/generate.ts:1383](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1383)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/generate.ts:1384](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1384)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/generate.ts:1386](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1386)

Top-p (nucleus) sampling parameter. Controls diversity of generated tokens.

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/generate.ts:1388](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1388)

Top-k sampling parameter. Limits the number of tokens considered. (Google/Gemini models only)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/generate.ts:1390](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1390)

Stop sequences that will halt generation when encountered.

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/generate.ts:1391](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1391)

---

### schema?

> `optional` **schema?**: [`ZodUnknownSchema`](ZodUnknownSchema.md) \| [`Schema`](Schema.md)\<`unknown`\>

Defined in: [types/generate.ts:1392](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1392)

---

### output?

> `optional` **output?**: `object`

Defined in: [types/generate.ts:1404](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1404)

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

Defined in: [types/generate.ts:1436](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1436)

---

### enabledToolNames?

> `optional` **enabledToolNames?**: `string`[]

Defined in: [types/generate.ts:1451](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1451)

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

Defined in: [types/generate.ts:1452](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1452)

---

### turnTimeoutMs?

> `optional` **turnTimeoutMs?**: `number`

Defined in: [types/generate.ts:1454](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1454)

Wall-clock cap for the whole agentic turn (ms). See GenerateOptions.turnTimeoutMs.

---

### stallTimeoutMs?

> `optional` **stallTimeoutMs?**: `number`

Defined in: [types/generate.ts:1456](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1456)

Max time with no progress before the turn ends as "stalled" (ms). See GenerateOptions.stallTimeoutMs.

---

### wrapupTimeLeadMs?

> `optional` **wrapupTimeLeadMs?**: `number`

Defined in: [types/generate.ts:1458](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1458)

Remaining-time threshold that triggers the wrap-up nudge (ms). See GenerateOptions.wrapupTimeLeadMs.

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number` \| `null`

Defined in: [types/generate.ts:1460](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1460)

Per-tool-execution timeout (ms, default 300_000; `null` for no bound). See GenerateOptions.toolTimeoutMs.

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/generate.ts:1462](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1462)

AbortSignal for external cancellation of the AI call

---

### toolExecutionCapture?

> `optional` **toolExecutionCapture?**: [`ToolExecutionCaptureOptions`](ToolExecutionCaptureOptions.md)

Defined in: [types/generate.ts:1464](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1464)

Bounds for tool execution capture. See GenerateOptions.toolExecutionCapture.

---

### disableTools?

> `optional` **disableTools?**: `boolean`

Defined in: [types/generate.ts:1472](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1472)

---

### disableToolCallRepair?

> `optional` **disableToolCallRepair?**: `boolean`

Defined in: [types/generate.ts:1474](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1474)

Disable the schema-driven tool call repair mechanism (BZ-665). Default: false (repair enabled).

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Defined in: [types/generate.ts:1475](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1475)

---

### toolRoots?

> `optional` **toolRoots?**: `string`[]

Defined in: [types/generate.ts:1477](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1477)

Directories the built-in file tools may touch for this call; see GenerateOptions.toolRoots.

---

### toolFilter?

> `optional` **toolFilter?**: `string`[]

Defined in: [types/generate.ts:1480](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1480)

Include only these tools by name (whitelist). If set, only matching tools are available.

---

### excludeTools?

> `optional` **excludeTools?**: `string`[]

Defined in: [types/generate.ts:1483](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1483)

Exclude these tools by name (blacklist). Applied after toolFilter.

---

### disableToolCache?

> `optional` **disableToolCache?**: `boolean`

Defined in: [types/generate.ts:1486](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1486)

Disable tool result caching for this request (overrides global mcp.cache.enabled)

---

### disableInternalFallback?

> `optional` **disableInternalFallback?**: `boolean`

Defined in: [types/generate.ts:1495](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1495)

Caller owns fallback order. Read in two places: `directProviderGeneration`
bounds its static provider-priority walk to one candidate, and
`BaseProvider.generate()` skips the catalog model-fallback walk so an
invalid-model error surfaces as itself. Mapped from
`GenerateOptions.disableInternalFallback`.

---

### toolChoice?

> `optional` **toolChoice?**: [`ToolChoice`](ToolChoice.md)\<`Record`\<`string`, [`Tool`](Tool.md)\>\>

Defined in: [types/generate.ts:1510](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1510)

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

Defined in: [types/generate.ts:1535](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1535)

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

Defined in: [types/generate.ts:1578](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1578)

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

Defined in: [types/generate.ts:1597](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1597)

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

Defined in: [types/generate.ts:1600](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1600)

---

### enableAnalytics?

> `optional` **enableAnalytics?**: `boolean`

Defined in: [types/generate.ts:1601](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1601)

---

### context?

> `optional` **context?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/generate.ts:1602](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1602)

---

### evaluationDomain?

> `optional` **evaluationDomain?**: `string`

Defined in: [types/generate.ts:1605](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1605)

---

### toolUsageContext?

> `optional` **toolUsageContext?**: `string`

Defined in: [types/generate.ts:1606](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1606)

---

### conversationHistory?

> `optional` **conversationHistory?**: `object`[]

Defined in: [types/generate.ts:1607](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1607)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### conversationMessages?

> `optional` **conversationMessages?**: [`ChatMessage`](ChatMessage.md)[]

Defined in: [types/generate.ts:1610](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1610)

---

### conversationMemoryConfig?

> `optional` **conversationMemoryConfig?**: `Partial`\<[`ConversationMemoryConfig`](ConversationMemoryConfig.md)\>

Defined in: [types/generate.ts:1613](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1613)

---

### originalPrompt?

> `optional` **originalPrompt?**: `string`

Defined in: [types/generate.ts:1614](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1614)

---

### middleware?

> `optional` **middleware?**: [`MiddlewareFactoryOptions`](MiddlewareFactoryOptions.md)

Defined in: [types/generate.ts:1617](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1617)

---

### onFinish?

> `optional` **onFinish?**: [`OnFinishCallback`](OnFinishCallback.md)

Defined in: [types/generate.ts:1625](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1625)

---

### onError?

> `optional` **onError?**: [`OnErrorCallback`](OnErrorCallback.md)

Defined in: [types/generate.ts:1626](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1626)

---

### expectedOutcome?

> `optional` **expectedOutcome?**: `string`

Defined in: [types/generate.ts:1629](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1629)

---

### evaluationCriteria?

> `optional` **evaluationCriteria?**: `string`[]

Defined in: [types/generate.ts:1630](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1630)

---

### csvOptions?

> `optional` **csvOptions?**: [`CSVProcessorOptions`](CSVProcessorOptions.md)

Defined in: [types/generate.ts:1633](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1633)

---

### pdfOptions?

> `optional` **pdfOptions?**: `object`

Defined in: [types/generate.ts:1636](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1636)

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

### imageOptions?

> `optional` **imageOptions?**: `object`

Defined in: [types/generate.ts:1654](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1654)

Options for images that need transcoding before a vision provider can
read them (HEIC, TIFF, BMP, ICO, JPEG 2000, AVIF — see
`adapters/imageFormatSupport.ts`). Mirrors `GenerateOptions.imageOptions`;
this is the shape that actually reaches `MessageBuilder` for providers
built on `BaseProvider`.

#### outputFormat?

> `optional` **outputFormat?**: [`VisionImageOutputFormat`](VisionImageOutputFormat.md)

Transcode target for an incompatible image. Defaults to `"png"` — the
module's own default, unchanged unless a caller opts in here.

---

### videoOptions?

> `optional` **videoOptions?**: `object`

Defined in: [types/generate.ts:1670](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1670)

Keyframe-extraction options for attached video files (#1748).

Mirrors `GenerateOptions.videoOptions`. This type never declared it, so
`buildGenerateTextOptions` could not have forwarded it even if it tried:
the CLI's `--video-frames`/`--video-quality`/`--video-format` were parsed,
accepted by the public type, and then dropped before the message builder.

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

Defined in: [types/generate.ts:1688](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1688)

Audio transcription options for attached audio files (#413/#440).

Mirrors `GenerateOptions.audioOptions`; declared here because
`buildGenerateTextOptions` rebuilds options field by field, so anything
missing from this type cannot reach the message builder at all.

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

OpenAI/Whisper-only context prompt to bias transcription; ignored by Google and Azure.

---

### enableSummarization?

> `optional` **enableSummarization?**: `boolean`

Defined in: [types/generate.ts:1699](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1699)

---

### skipToolPromptInjection?

> `optional` **skipToolPromptInjection?**: `boolean`

Defined in: [types/generate.ts:1717](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1717)

Skip injecting tool schemas into the system prompt.
When true, tools are ONLY passed natively via the provider's `tools` parameter,
avoiding duplicate tool definitions (~30K tokens savings per call).
Default: false (backward compatible — tool schemas are injected into system prompt).

---

### thinking?

> `optional` **thinking?**: `boolean`

Defined in: [types/generate.ts:1783](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1783)

Enable extended thinking capability (simplified option).
Equivalent to `thinkingConfig.enabled = true`.
Works with both Anthropic and Gemini 3 models.

---

### thinkingBudget?

> `optional` **thinkingBudget?**: `number`

Defined in: [types/generate.ts:1790](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1790)

Token budget for thinking (Anthropic models only).
Equivalent to `thinkingConfig.budgetTokens`.
Range: 5000-100000 tokens. Ignored for Gemini models.

---

### thinkingLevel?

> `optional` **thinkingLevel?**: `"minimal"` \| `"low"` \| `"medium"` \| `"high"`

Defined in: [types/generate.ts:1801](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1801)

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

Defined in: [types/generate.ts:1809](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1809)

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

Defined in: [types/generate.ts:1825](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1825)

Per-provider credential overrides for this request.
Overrides instance-level credentials set in `new NeuroLink({ credentials })`.
Unset providers fall through to instance credentials, then environment variables.

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/generate.ts:1832](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1832)

Optional request identifier for observability and log correlation.
When provided, this ID is forwarded to spans, logs, and telemetry so
callers can correlate generation traces back to their own request lifecycle.

---

### piiDetection?

> `optional` **piiDetection?**: [`GenerateOptions`](GenerateOptions.md)\[`"piiDetection"`\]

Defined in: [types/generate.ts:1835](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1835)

PII detection config — forwarded from GenerateOptions/StreamOptions.

---

### responseValidation?

> `optional` **responseValidation?**: [`GenerateOptions`](GenerateOptions.md)\[`"responseValidation"`\]

Defined in: [types/generate.ts:1838](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1838)

Response validation config — forwarded from GenerateOptions/StreamOptions.

---

### inputValidation?

> `optional` **inputValidation?**: [`GenerateOptions`](GenerateOptions.md)\[`"inputValidation"`\]

Defined in: [types/generate.ts:1841](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1841)

Input validation config — forwarded from GenerateOptions/StreamOptions.

---

### ~~processors?~~

> `optional` **processors?**: [`ProcessorPipelineConfig`](ProcessorPipelineConfig.md)

Defined in: [types/generate.ts:1844](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1844)

#### Deprecated

Use `piiDetection`, `responseValidation`, `inputValidation` instead.
