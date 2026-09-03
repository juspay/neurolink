[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenerateOptions

# Type Alias: GenerateOptions

> **GenerateOptions** = `object`

Defined in: [types/generate.ts:50](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L50)

Generate function options type - Primary method for content generation
Supports multimodal content while maintaining backward compatibility

## Properties

### input?

> `optional` **input?**: `object`

Defined in: [types/generate.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L56)

Input content for generation. Optional for media-only modes (avatar, music,
video) where all configuration lives in `output`; the SDK synthesises an
empty `input` automatically when this field is omitted.

#### text?

> `optional` **text?**: `string`

Prompt text. Optional for media-only modes (avatar, music) that are driven by uploaded files rather than a prompt.

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

#### nativeAudioFiles?

> `optional` **nativeAudioFiles?**: [`MultimodalAudioEntry`](MultimodalAudioEntry.md)[]

Audio whose bytes should be delivered to the provider, populated during
detection rather than by callers.

Separate from `audioFiles` above, which is the caller-facing input that
yields a metadata summary. This one carries the decoded bytes forward so
a provider that can actually listen receives the audio instead of a
description of it; providers that cannot fall back to the summary and
this is ignored.

#### videoFiles?

> `optional` **videoFiles?**: (`Buffer` \| `string`)[]

#### files?

> `optional` **files?**: (`Buffer` \| `string` \| [`FileWithMetadata`](FileWithMetadata.md))[]

#### content?

> `optional` **content?**: [`Content`](Content.md)[]

#### segments?

> `optional` **segments?**: [`DirectorSegment`](DirectorSegment.md)[]

Director Mode segments. When provided, Director Mode is activated automatically.
Each segment contains its own prompt and image.
Must contain 2-10 segments.

---

### output?

> `optional` **output?**: `object`

Defined in: [types/generate.ts:123](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L123)

Output configuration options

#### format?

> `optional` **format?**: `"text"` \| `"structured"` \| `"json"`

Output format for text generation

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
Requires an input image and text prompt

#### ppt?

> `optional` **ppt?**: [`PPTOutputOptions`](PPTOutputOptions.md)

PowerPoint generation configuration (used when mode is "ppt")
Generates slides based on text prompt

#### director?

> `optional` **director?**: [`DirectorModeOptions`](DirectorModeOptions.md)

Director Mode configuration (only used when input.segments is provided)
Controls transition prompts, durations, and concurrency.

#### avatar?

> `optional` **avatar?**: [`AvatarOptions`](AvatarOptions.md)

Avatar generation configuration (used when mode is "avatar")
Combines a portrait image with audio (or text via TTS) to produce
a lip-synced talking-head video.

#### music?

> `optional` **music?**: [`MusicOptions`](MusicOptions.md)

Music generation configuration (used when mode is "music")
Generates music / sound from a text prompt.

#### Examples

```typescript
output: {
  format: "text";
}
```

```typescript
output: {
  mode: "video",
  video: {
    resolution: "1080p",
    length: 8,
    aspectRatio: "16:9",
    audio: true
  }
}
```

---

### csvOptions?

> `optional` **csvOptions?**: [`CSVProcessorOptions`](CSVProcessorOptions.md)

Defined in: [types/generate.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L165)

---

### pdfOptions?

> `optional` **pdfOptions?**: `object`

Defined in: [types/generate.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L168)

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

Defined in: [types/generate.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L187)

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

### tts?

> `optional` **tts?**: [`TTSOptions`](TTSOptions.md)

Defined in: [types/generate.ts:230](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L230)

Text-to-Speech (TTS) configuration

Enable audio generation from the text response. The generated audio will be
returned in the result's `audio` field as a TTSResult object.

#### Examples

```typescript
const result = await neurolink.generate({
  input: { text: "Tell me a story" },
  provider: "google-ai",
  tts: { enabled: true, voice: "en-US-Neural2-C" },
});
console.log(result.audio?.buffer); // Audio Buffer
```

```typescript
const result = await neurolink.generate({
  input: { text: "Speak slowly and clearly" },
  provider: "google-ai",
  tts: {
    enabled: true,
    voice: "en-US-Neural2-D",
    speed: 0.8,
    pitch: 2.0,
    format: "mp3",
    quality: "standard",
  },
});
```

---

### stt?

> `optional` **stt?**: [`STTOptions`](STTOptions.md) & `object`

Defined in: [types/generate.ts:249](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L249)

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

### thinkingConfig?

> `optional` **thinkingConfig?**: `object`

Defined in: [types/generate.ts:291](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L291)

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
const result = await neurolink.generate({
  input: { text: "Solve this complex problem..." },
  provider: "google-ai",
  model: "gemini-3.1-pro-preview",
  thinkingConfig: {
    thinkingLevel: "high",
  },
});
```

```typescript
const result = await neurolink.generate({
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

Defined in: [types/generate.ts:301](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L301)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/generate.ts:302](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L302)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/generate.ts:303](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L303)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/generate.ts:304](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L304)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/generate.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L305)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/generate.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L307)

Top-p (nucleus) sampling parameter. Controls diversity of generated tokens.

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/generate.ts:309](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L309)

Top-k sampling parameter. Limits the number of tokens considered. (Google/Gemini models only)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/generate.ts:311](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L311)

Stop sequences that will halt generation when encountered.

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/generate.ts:312](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L312)

---

### schema?

> `optional` **schema?**: [`ValidationSchema`](ValidationSchema.md)

Defined in: [types/generate.ts:358](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L358)

Zod schema for structured output validation

#### Important

Google GEMINI limitation (Gemini models only)
Gemini models (Google AI Studio, and Vertex GEMINI models) cannot combine
function calling with schema-enforced structured output — a Gemini API
limitation ("Function calling with a response mime type:
'application/json' is unsupported"). Vertex CLAUDE models and all other
providers support tools + schema simultaneously.

You do NOT need to set `disableTools` yourself: when the combination is
impossible, NeuroLink automatically falls back to text-mode JSON coercion
(see `coerceJsonToSchema`), and `disableTools: true` remains available as
an explicit override.

On the native Anthropic Messages surface (provider "anthropic", including
via a proxy) tools + schema are honored through an internal `final_result`
tool the model calls with the structured answer — invisible to callers: it
never appears in `toolCalls` / `toolExecutions`.

#### Example

```typescript
// ✅ Vertex + Claude: tools AND schema together are fully supported
const result = await neurolink.generate({
  schema: MySchema,
  provider: "vertex",
  model: "claude-sonnet-4-6",
});

// ✅ Direct Anthropic + tools: schema honored via the final_result tool
const result = await neurolink.generate({
  schema: MySchema,
  provider: "anthropic",
});

// ✅ Gemini + tools: SDK auto-falls back to coerced text-mode JSON
const result = await neurolink.generate({
  schema: MySchema,
  provider: "google-ai",
  model: "gemini-2.5-pro",
});
```

#### See

https://ai.google.dev/gemini-api/docs/function-calling

---

### tools?

> `optional` **tools?**: `Record`\<`string`, [`Tool`](Tool.md)\>

Defined in: [types/generate.ts:359](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L359)

---

### enabledToolNames?

> `optional` **enabledToolNames?**: `string`[]

Defined in: [types/generate.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L373)

Filter available tools by name.
Only tools with names in this array will be made available.
Used by dynamic arguments to dynamically select which tools to enable.

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

Defined in: [types/generate.ts:394](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L394)

Request timeout (e.g. 30000, '30s', '2m').

PER-STEP semantics in agentic loops: on providers that run a native
multi-step tool loop (Vertex Gemini / Vertex Claude), this bounds EACH
model call in the loop, not the whole turn — a tool-heavy turn may run
far longer than this value in total. Size it for the slowest single
step (default 300s), and use `turnTimeoutMs` (or `abortSignal`) for a
total-turn deadline.

On the AI-SDK loop path (direct Anthropic, litellm, OpenAI-compatible)
the same split holds only when `turnTimeoutMs` is ALSO set: then this
value bounds each model call and `turnTimeoutMs` bounds the turn. With
`turnTimeoutMs` unset, this value bounds the WHOLE turn there (the
pre-existing defensive behavior, kept for backward compatibility).

When set explicitly, a step timeout is surfaced immediately instead of
burning internal retries/fallbacks that would re-run the same
provider+model with the same doomed budget.

---

### turnTimeoutMs?

> `optional` **turnTimeoutMs?**: `number`

Defined in: [types/generate.ts:414](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L414)

Hard wall-clock cap for the WHOLE agentic turn (all model calls + tool
executions), in milliseconds. When the deadline passes the turn ends
gracefully with `stopReason: "time-limit"` and an honest time message —
never the step-cap text. Unset = no turn-level deadline (the library
imposes no product policy).

Enforced by the native Vertex loops (Gemini + Claude) AND the AI-SDK
loop path (direct Anthropic, litellm and other OpenAI-compatible
providers). On the AI-SDK path this value also owns the whole-turn hard
abort: when set, `timeout` keeps its per-model-call meaning instead of
bounding the entire loop. An explicit `timeout` also engages the same
wrap-up when `turnTimeoutMs` is unset. Once the wrap-up window begins (see
`wrapupTimeLeadMs`), the loop forcibly sets `toolChoice: "none"` for the
remaining steps — overriding any caller-supplied `toolChoice` or
`prepareStep` tool selection — and appends an honest time message that a
caller's `prepareStep` callback does not observe (it runs before the
wrap-up nudge is applied). An honest partial beats a discarded turn.

---

### stallTimeoutMs?

> `optional` **stallTimeoutMs?**: `number`

Defined in: [types/generate.ts:429](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L429)

Maximum time with NO progress — no stream chunk received, no tool
execution started or finished, no step started — before the turn ends
with `stopReason: "stalled"`. Catches wedged tools and hung model calls
that a whole-turn deadline would let run to the bitter end.
Unset = disabled.

Enforced by the native Vertex loops (Gemini + Claude) ONLY. Unlike
`turnTimeoutMs`, the AI-SDK loop path does not implement stall detection,
so setting this on any other provider has no effect — the turn runs until
it finishes, times out some other way, or the caller aborts. The narrower
scope is stated here because the option itself is accepted everywhere:
without this note a caller would reasonably read silence as coverage.

---

### wrapupTimeLeadMs?

> `optional` **wrapupTimeLeadMs?**: `number`

Defined in: [types/generate.ts:441](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L441)

When the remaining turn time drops below this, a wrap-up nudge rides the
next tool-result turn telling the model to consolidate what it has and
produce its final answer. Defaults to 120_000 when `turnTimeoutMs` is
set; ignored when it is not.

On the AI-SDK loop path the lead is clamped to a quarter of the turn
budget (so short budgets don't wrap up on step one) and wrap-up steps
run with a forced `toolChoice: "none"` — see `turnTimeoutMs` for the
exact override semantics.

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number`

Defined in: [types/generate.ts:447](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L447)

Per-tool-execution timeout in milliseconds (default 300_000). A tool
that exceeds it fails with an error tool_result and costs one step —
the turn continues instead of hanging on a wedged tool.

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/generate.ts:449](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L449)

AbortSignal for external cancellation of the AI call

---

### toolExecutionCapture?

> `optional` **toolExecutionCapture?**: [`ToolExecutionCaptureOptions`](ToolExecutionCaptureOptions.md)

Defined in: [types/generate.ts:456](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L456)

Bounds for the per-call tool execution records surfaced on
`GenerateResult.toolExecutions`. Capture is on by default
(maxResultChars 8192, maxRecords 500); pass larger caps when the caller
needs full result texts.

---

### disableToolCallRepair?

> `optional` **disableToolCallRepair?**: `boolean`

Defined in: [types/generate.ts:458](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L458)

Disable the schema-driven tool call repair mechanism (BZ-665). Default: false (repair enabled).

---

### disableTools?

> `optional` **disableTools?**: `boolean`

Defined in: [types/generate.ts:478](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L478)

Disable tool execution (including built-in tools)

Optional with schemas: the tools↔schema exclusion applies only to Google
GEMINI models (Google AI Studio / Vertex Gemini — a Gemini API
limitation), and NeuroLink handles it automatically by falling back to
text-mode JSON coercion. Vertex CLAUDE models support tools + schema
together. Set this only when you explicitly want a tool-free call.

#### Example

```typescript
// Explicit override: schema-only call with no tools at all
await neurolink.generate({
  schema: MySchema,
  provider: "google-ai",
  disableTools: true,
});
```

---

### toolFilter?

> `optional` **toolFilter?**: `string`[]

Defined in: [types/generate.ts:481](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L481)

Include only these tools by name (whitelist). If set, only matching tools are available.

---

### excludeTools?

> `optional` **excludeTools?**: `string`[]

Defined in: [types/generate.ts:484](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L484)

Exclude these tools by name (blacklist). Applied after toolFilter.

---

### skipToolPromptInjection?

> `optional` **skipToolPromptInjection?**: `boolean`

Defined in: [types/generate.ts:492](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L492)

Skip injecting tool schemas into the system prompt.
When true, tools are ONLY passed natively via the provider's `tools` parameter,
avoiding duplicate tool definitions (~30K tokens savings per call).
Default: false (backward compatible — tool schemas are injected into system prompt).

---

### disableToolCache?

> `optional` **disableToolCache?**: `boolean`

Defined in: [types/generate.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L495)

Disable tool result caching for this request (overrides global mcp.cache.enabled)

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Defined in: [types/generate.ts:498](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L498)

Maximum number of tool execution steps (default: 200)

---

### toolChoice?

> `optional` **toolChoice?**: [`ToolChoice`](ToolChoice.md)\<`Record`\<`string`, [`Tool`](Tool.md)\>\>

Defined in: [types/generate.ts:513](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L513)

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

Defined in: [types/generate.ts:538](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L538)

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

### enableEvaluation?

> `optional` **enableEvaluation?**: `boolean`

Defined in: [types/generate.ts:553](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L553)

---

### enableAnalytics?

> `optional` **enableAnalytics?**: `boolean`

Defined in: [types/generate.ts:554](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L554)

---

### context?

> `optional` **context?**: [`StandardRecord`](StandardRecord.md)

Defined in: [types/generate.ts:555](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L555)

---

### evaluationDomain?

> `optional` **evaluationDomain?**: `string`

Defined in: [types/generate.ts:558](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L558)

---

### toolUsageContext?

> `optional` **toolUsageContext?**: `string`

Defined in: [types/generate.ts:559](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L559)

---

### ~~conversationHistory?~~

> `optional` **conversationHistory?**: `object`[]

Defined in: [types/generate.ts:566](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L566)

#### ~~role~~

> **role**: `string`

#### ~~content~~

> **content**: `string`

#### Deprecated

Use `conversationMessages` instead. This field uses a simple `{role, content}` shape
that is not consumed by `buildMessagesArray()` — messages passed here will NOT reach the AI model
as proper conversation turns. `conversationMessages` uses the full `ChatMessage` type and is
correctly wired through the entire generate pipeline.

---

### conversationMessages?

> `optional` **conversationMessages?**: [`ChatMessage`](ChatMessage.md)[]

Defined in: [types/generate.ts:574](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L574)

Previous conversation as a ChatMessage array.
Messages are injected as proper multi-turn conversation history before the current prompt,
so the AI model sees them as real prior exchanges (not text dumped into the prompt).
Used by task continuation mode and available to external callers.

---

### factoryConfig?

> `optional` **factoryConfig?**: `object`

Defined in: [types/generate.ts:577](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L577)

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

Defined in: [types/generate.ts:591](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L591)

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

### workflow?

> `optional` **workflow?**: `string`

Defined in: [types/generate.ts:600](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L600)

---

### workflowConfig?

> `optional` **workflowConfig?**: [`WorkflowConfig`](WorkflowConfig.md)

Defined in: [types/generate.ts:601](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L601)

---

### rag?

> `optional` **rag?**: [`RAGConfig`](RAGConfig.md)

Defined in: [types/generate.ts:635](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L635)

RAG (Retrieval-Augmented Generation) configuration.

When provided, NeuroLink automatically loads the specified files, chunks them,
generates embeddings, and creates a search tool that the AI model can invoke
on demand to find relevant context before answering.

#### Examples

```typescript
const result = await neurolink.generate({
  input: { text: "What is RAG?" },
  provider: "vertex",
  rag: {
    files: ["./docs/guide.md"],
  },
});
```

```typescript
const result = await neurolink.generate({
  input: { text: "Explain chunking strategies" },
  provider: "vertex",
  rag: {
    files: ["./docs/guide.md", "./docs/api.md"],
    strategy: "markdown",
    chunkSize: 512,
    topK: 5,
  },
});
```

---

### maxBudgetUsd?

> `optional` **maxBudgetUsd?**: `number`

Defined in: [types/generate.ts:650](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L650)

Maximum budget in USD for this session. When the accumulated cost of all
generate() calls on this NeuroLink instance exceeds this value, subsequent
calls will throw a budget-exceeded error before making the API request.

#### Example

```typescript
const result = await neurolink.generate({
  input: { text: "Summarize this" },
  maxBudgetUsd: 1.0,
});
```

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/generate.ts:657](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L657)

Optional request identifier for observability and log correlation.
When provided, this ID is forwarded to spans, logs, and telemetry so
callers can correlate generation traces back to their own request lifecycle.

---

### middleware?

> `optional` **middleware?**: [`MiddlewareFactoryOptions`](MiddlewareFactoryOptions.md)

Defined in: [types/generate.ts:672](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L672)

Per-call middleware configuration.

---

### onFinish?

> `optional` **onFinish?**: [`OnFinishCallback`](OnFinishCallback.md)

Defined in: [types/generate.ts:675](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L675)

Callback invoked when generation completes successfully.

---

### onError?

> `optional` **onError?**: [`OnErrorCallback`](OnErrorCallback.md)

Defined in: [types/generate.ts:678](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L678)

Callback invoked when generation encounters an error.

---

### requestContext?

> `optional` **requestContext?**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:681](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L681)

Pre-validated user context for the request

---

### useKnowledgeGrounding?

> `optional` **useKnowledgeGrounding?**: `boolean`

Defined in: [types/generate.ts:687](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L687)

Opt this generation call into the knowledge grounding configured on the
NeuroLink instance. Defaults to `false` when omitted.

---

### knowledgeContext?

> `optional` **knowledgeContext?**: [`KnowledgeRequestScope`](KnowledgeRequestScope.md)

Defined in: [types/generate.ts:694](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L694)

Enabled integrations used to scope knowledge retrieval for this turn.
Used only when `useKnowledgeGrounding` is true and knowledge grounding is
enabled on the NeuroLink instance.

---

### auth?

> `optional` **auth?**: `object`

Defined in: [types/generate.ts:697](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L697)

Raw auth token — validated by configured auth provider

#### token

> **token**: `string`

---

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)

Defined in: [types/generate.ts:704](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L704)

Per-provider credential overrides for this request.
Overrides instance-level credentials set in `new NeuroLink({ credentials })`.
Unset providers fall through to instance credentials, then environment variables.

---

### providerFallback?

> `optional` **providerFallback?**: (`error`) => `Promise`\<\{ `provider?`: `string`; `model?`: `string`; \} \| `null`\>

Defined in: [types/generate.ts:715](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L715)

Curator P2-3: per-call fallback callback. Overrides any
instance-level `providerFallback` set on `new NeuroLink({...})`.
Invoked for any error except a genuine caller cancel — i.e. this
call's `abortSignal` fired (network errors, 5xx, timeouts, auth
failures, model-access-denied, and internal watchdog aborts all invoke
it); receives the error unmodified. Return `{ provider, model }` to
retry, `null` to bubble.

#### Parameters

##### error

`unknown`

#### Returns

`Promise`\<\{ `provider?`: `string`; `model?`: `string`; \} \| `null`\>

---

### modelChain?

> `optional` **modelChain?**: `string`[]

Defined in: [types/generate.ts:725](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L725)

Curator P2-3: per-call ordered model chain. Overrides any
instance-level `modelChain`. Without an explicit `providerFallback`
callback the chain only advances on model-access-denied errors —
other failures (network, 5xx, timeouts) bubble immediately.

---

### memory?

> `optional` **memory?**: `object`

Defined in: [types/generate.ts:735](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L735)

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

Defined in: [types/generate.ts:754](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L754)

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

#### Example

```ts
{ enabled: true, action: "redact", detectTypes: ["ssn", "email"] }
```

---

### responseValidation?

> `optional` **responseValidation?**: `object`

Defined in: [types/generate.ts:779](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L779)

Response validation — validates and optionally transforms the LLM response.
Supports retry-with-feedback when `retryOnFailure: true`.

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

#### Example

```ts
{ maxLength: 5000, truncationAction: "truncate", retryOnFailure: true }
```

---

### inputValidation?

> `optional` **inputValidation?**: `object`

Defined in: [types/generate.ts:797](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L797)

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

Defined in: [types/generate.ts:807](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L807)

#### Deprecated

Use `piiDetection`, `responseValidation`, and `inputValidation` instead.

---

### skills?

> `optional` **skills?**: [`SkillsCallOptions`](SkillsCallOptions.md)

Defined in: [types/generate.ts:815](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L815)

Per-call skills control. Only effective when the instance was
constructed with `skills.enabled: true`. Lets a call disable the
prompt index, or narrow it by scope/tags. Per-call wins over
instance config.
