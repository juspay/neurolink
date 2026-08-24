[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextGenerationOptions

# Type Alias: TextGenerationOptions

> **TextGenerationOptions** = `object`

Defined in: [types/generate.ts:1199](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1199)

Text generation options type (consolidated from core types)
Extended to support video generation mode

## Properties

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/generate.ts:1200](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1200)

---

### input?

> `optional` **input?**: `object`

Defined in: [types/generate.ts:1210](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1210)

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

#### files?

> `optional` **files?**: (`Buffer` \| `string` \| [`FileWithMetadata`](FileWithMetadata.md))[]

#### segments?

> `optional` **segments?**: [`DirectorSegment`](DirectorSegment.md)[]

Director Mode segments (2-10). When provided, Director Mode is activated.

---

### provider?

> `optional` **provider?**: [`AIProviderName`](../enumerations/AIProviderName.md)

Defined in: [types/generate.ts:1223](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1223)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/generate.ts:1224](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1224)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/generate.ts:1225](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1225)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/generate.ts:1226](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1226)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/generate.ts:1227](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1227)

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/generate.ts:1229](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1229)

Top-p (nucleus) sampling parameter. Controls diversity of generated tokens.

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/generate.ts:1231](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1231)

Top-k sampling parameter. Limits the number of tokens considered. (Google/Gemini models only)

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/generate.ts:1233](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1233)

Stop sequences that will halt generation when encountered.

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/generate.ts:1234](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1234)

---

### schema?

> `optional` **schema?**: [`ZodUnknownSchema`](ZodUnknownSchema.md) \| `Schema`\<`unknown`\>

Defined in: [types/generate.ts:1235](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1235)

---

### output?

> `optional` **output?**: `object`

Defined in: [types/generate.ts:1247](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1247)

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

> `optional` **tools?**: `Record`\<`string`, `Tool`\>

Defined in: [types/generate.ts:1279](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1279)

---

### enabledToolNames?

> `optional` **enabledToolNames?**: `string`[]

Defined in: [types/generate.ts:1294](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1294)

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

Defined in: [types/generate.ts:1295](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1295)

---

### turnTimeoutMs?

> `optional` **turnTimeoutMs?**: `number`

Defined in: [types/generate.ts:1297](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1297)

Wall-clock cap for the whole agentic turn (ms). See GenerateOptions.turnTimeoutMs.

---

### stallTimeoutMs?

> `optional` **stallTimeoutMs?**: `number`

Defined in: [types/generate.ts:1299](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1299)

Max time with no progress before the turn ends as "stalled" (ms). See GenerateOptions.stallTimeoutMs.

---

### wrapupTimeLeadMs?

> `optional` **wrapupTimeLeadMs?**: `number`

Defined in: [types/generate.ts:1301](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1301)

Remaining-time threshold that triggers the wrap-up nudge (ms). See GenerateOptions.wrapupTimeLeadMs.

---

### toolTimeoutMs?

> `optional` **toolTimeoutMs?**: `number`

Defined in: [types/generate.ts:1303](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1303)

Per-tool-execution timeout (ms, default 300_000). See GenerateOptions.toolTimeoutMs.

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/generate.ts:1305](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1305)

AbortSignal for external cancellation of the AI call

---

### toolExecutionCapture?

> `optional` **toolExecutionCapture?**: [`ToolExecutionCaptureOptions`](ToolExecutionCaptureOptions.md)

Defined in: [types/generate.ts:1307](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1307)

Bounds for tool execution capture. See GenerateOptions.toolExecutionCapture.

---

### disableTools?

> `optional` **disableTools?**: `boolean`

Defined in: [types/generate.ts:1315](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1315)

---

### disableToolCallRepair?

> `optional` **disableToolCallRepair?**: `boolean`

Defined in: [types/generate.ts:1317](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1317)

Disable the schema-driven tool call repair mechanism (BZ-665). Default: false (repair enabled).

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Defined in: [types/generate.ts:1318](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1318)

---

### toolFilter?

> `optional` **toolFilter?**: `string`[]

Defined in: [types/generate.ts:1321](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1321)

Include only these tools by name (whitelist). If set, only matching tools are available.

---

### excludeTools?

> `optional` **excludeTools?**: `string`[]

Defined in: [types/generate.ts:1324](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1324)

Exclude these tools by name (blacklist). Applied after toolFilter.

---

### disableToolCache?

> `optional` **disableToolCache?**: `boolean`

Defined in: [types/generate.ts:1327](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1327)

Disable tool result caching for this request (overrides global mcp.cache.enabled)

---

### toolChoice?

> `optional` **toolChoice?**: `ToolChoice`\<`Record`\<`string`, `Tool`\>\>

Defined in: [types/generate.ts:1342](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1342)

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

> `optional` **prepareStep?**: (`options`) => `PromiseLike`\<\{ `model?`: `LanguageModel`; `toolChoice?`: `ToolChoice`\<`Record`\<`string`, `Tool`\>\>; `experimental_activeTools?`: `string`[]; \} \| `undefined`\>

Defined in: [types/generate.ts:1367](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1367)

Optional callback that runs before each step in a multi-step generation.
Allows dynamically changing `toolChoice` and available tools per step.

This is the recommended way to enforce specific tool calls on certain steps
while allowing the model freedom on others.

Maps to Vercel AI SDK's `experimental_prepareStep`.

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

`PromiseLike`\<\{ `model?`: `LanguageModel`; `toolChoice?`: `ToolChoice`\<`Record`\<`string`, `Tool`\>\>; `experimental_activeTools?`: `string`[]; \} \| `undefined`\>

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

Defined in: [types/generate.ts:1410](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1410)

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

Defined in: [types/generate.ts:1429](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1429)

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

Defined in: [types/generate.ts:1432](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1432)

---

### enableAnalytics?

> `optional` **enableAnalytics?**: `boolean`

Defined in: [types/generate.ts:1433](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1433)

---

### context?

> `optional` **context?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/generate.ts:1434](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1434)

---

### evaluationDomain?

> `optional` **evaluationDomain?**: `string`

Defined in: [types/generate.ts:1437](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1437)

---

### toolUsageContext?

> `optional` **toolUsageContext?**: `string`

Defined in: [types/generate.ts:1438](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1438)

---

### conversationHistory?

> `optional` **conversationHistory?**: `object`[]

Defined in: [types/generate.ts:1439](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1439)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### conversationMessages?

> `optional` **conversationMessages?**: [`ChatMessage`](ChatMessage.md)[]

Defined in: [types/generate.ts:1442](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1442)

---

### conversationMemoryConfig?

> `optional` **conversationMemoryConfig?**: `Partial`\<[`ConversationMemoryConfig`](ConversationMemoryConfig.md)\>

Defined in: [types/generate.ts:1445](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1445)

---

### originalPrompt?

> `optional` **originalPrompt?**: `string`

Defined in: [types/generate.ts:1446](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1446)

---

### middleware?

> `optional` **middleware?**: [`MiddlewareFactoryOptions`](MiddlewareFactoryOptions.md)

Defined in: [types/generate.ts:1449](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1449)

---

### onFinish?

> `optional` **onFinish?**: [`OnFinishCallback`](OnFinishCallback.md)

Defined in: [types/generate.ts:1457](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1457)

---

### onError?

> `optional` **onError?**: [`OnErrorCallback`](OnErrorCallback.md)

Defined in: [types/generate.ts:1458](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1458)

---

### expectedOutcome?

> `optional` **expectedOutcome?**: `string`

Defined in: [types/generate.ts:1461](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1461)

---

### evaluationCriteria?

> `optional` **evaluationCriteria?**: `string`[]

Defined in: [types/generate.ts:1462](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1462)

---

### csvOptions?

> `optional` **csvOptions?**: [`CSVProcessorOptions`](CSVProcessorOptions.md)

Defined in: [types/generate.ts:1465](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1465)

---

### pdfOptions?

> `optional` **pdfOptions?**: `object`

Defined in: [types/generate.ts:1468](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1468)

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

### enableSummarization?

> `optional` **enableSummarization?**: `boolean`

Defined in: [types/generate.ts:1479](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1479)

---

### skipToolPromptInjection?

> `optional` **skipToolPromptInjection?**: `boolean`

Defined in: [types/generate.ts:1497](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1497)

Skip injecting tool schemas into the system prompt.
When true, tools are ONLY passed natively via the provider's `tools` parameter,
avoiding duplicate tool definitions (~30K tokens savings per call).
Default: false (backward compatible — tool schemas are injected into system prompt).

---

### thinking?

> `optional` **thinking?**: `boolean`

Defined in: [types/generate.ts:1554](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1554)

Enable extended thinking capability (simplified option).
Equivalent to `thinkingConfig.enabled = true`.
Works with both Anthropic and Gemini 3 models.

---

### thinkingBudget?

> `optional` **thinkingBudget?**: `number`

Defined in: [types/generate.ts:1561](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1561)

Token budget for thinking (Anthropic models only).
Equivalent to `thinkingConfig.budgetTokens`.
Range: 5000-100000 tokens. Ignored for Gemini models.

---

### thinkingLevel?

> `optional` **thinkingLevel?**: `"minimal"` \| `"low"` \| `"medium"` \| `"high"`

Defined in: [types/generate.ts:1572](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1572)

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

Defined in: [types/generate.ts:1580](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1580)

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

Defined in: [types/generate.ts:1596](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1596)

Per-provider credential overrides for this request.
Overrides instance-level credentials set in `new NeuroLink({ credentials })`.
Unset providers fall through to instance credentials, then environment variables.

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/generate.ts:1603](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1603)

Optional request identifier for observability and log correlation.
When provided, this ID is forwarded to spans, logs, and telemetry so
callers can correlate generation traces back to their own request lifecycle.

---

### piiDetection?

> `optional` **piiDetection?**: [`GenerateOptions`](GenerateOptions.md)\[`"piiDetection"`\]

Defined in: [types/generate.ts:1606](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1606)

PII detection config — forwarded from GenerateOptions/StreamOptions.

---

### responseValidation?

> `optional` **responseValidation?**: [`GenerateOptions`](GenerateOptions.md)\[`"responseValidation"`\]

Defined in: [types/generate.ts:1609](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1609)

Response validation config — forwarded from GenerateOptions/StreamOptions.

---

### inputValidation?

> `optional` **inputValidation?**: [`GenerateOptions`](GenerateOptions.md)\[`"inputValidation"`\]

Defined in: [types/generate.ts:1612](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1612)

Input validation config — forwarded from GenerateOptions/StreamOptions.

---

### ~~processors?~~

> `optional` **processors?**: [`ProcessorPipelineConfig`](ProcessorPipelineConfig.md)

Defined in: [types/generate.ts:1615](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1615)

#### Deprecated

Use `piiDetection`, `responseValidation`, `inputValidation` instead.
