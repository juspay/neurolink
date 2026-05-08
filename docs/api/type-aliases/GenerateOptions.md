[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenerateOptions

# Type Alias: GenerateOptions

> **GenerateOptions** = `object`

Defined in: [types/generate.ts:36](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L36)

Generate function options type - Primary method for content generation
Supports multimodal content while maintaining backward compatibility

## Properties

### input

> **input**: `object`

Defined in: [types/generate.ts:37](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L37)

#### text

> **text**: `string`

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

#### segments?

> `optional` **segments?**: [`DirectorSegment`](DirectorSegment.md)[]

Director Mode segments. When provided, Director Mode is activated automatically.
Each segment contains its own prompt and image.
Must contain 2-10 segments.

---

### output?

> `optional` **output?**: `object`

Defined in: [types/generate.ts:91](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L91)

Output configuration options

#### format?

> `optional` **format?**: `"text"` \| `"structured"` \| `"json"`

Output format for text generation

#### mode?

> `optional` **mode?**: `"text"` \| `"video"` \| `"ppt"`

Output mode - determines the type of content generated

- "text": Standard text generation (default)
- "video": Video generation using models like Veo 3.1
- "ppt": PowerPoint presentation generation

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

> `optional` **csvOptions?**: `object`

Defined in: [types/generate.ts:119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L119)

#### maxRows?

> `optional` **maxRows?**: `number`

#### formatStyle?

> `optional` **formatStyle?**: `"raw"` \| `"markdown"` \| `"json"`

#### includeHeaders?

> `optional` **includeHeaders?**: `boolean`

---

### videoOptions?

> `optional` **videoOptions?**: `object`

Defined in: [types/generate.ts:126](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L126)

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

Defined in: [types/generate.ts:165](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L165)

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

Defined in: [types/generate.ts:184](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L184)

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

Defined in: [types/generate.ts:226](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L226)

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

Defined in: [types/generate.ts:236](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L236)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/generate.ts:237](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L237)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/generate.ts:238](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L238)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/generate.ts:239](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L239)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/generate.ts:240](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L240)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/generate.ts:241](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L241)

---

### schema?

> `optional` **schema?**: [`ValidationSchema`](ValidationSchema.md)

Defined in: [types/generate.ts:274](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L274)

Zod schema for structured output validation

#### Important

Google Gemini Limitation
Google Vertex AI and Google AI Studio cannot combine function calling with
structured output. You MUST use `disableTools: true` when using schemas with
Google providers.

Error without disableTools: "Function calling with a response mime type:
'application/json' is unsupported"

This is a documented Google API limitation, not a NeuroLink bug.
All frameworks (LangChain, Vercel AI SDK, Agno, Instructor) use this approach.

#### Example

```typescript
// ✅ Correct for Google providers
const result = await neurolink.generate({
  schema: MySchema,
  provider: "vertex",
  disableTools: true, // Required for Google
});

// ✅ No restriction for other providers
const result = await neurolink.generate({
  schema: MySchema,
  provider: "openai", // Works without disableTools
});
```

#### See

https://ai.google.dev/gemini-api/docs/function-calling

---

### tools?

> `optional` **tools?**: `Record`\<`string`, `Tool`\>

Defined in: [types/generate.ts:275](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L275)

---

### enabledToolNames?

> `optional` **enabledToolNames?**: `string`[]

Defined in: [types/generate.ts:289](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L289)

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

Defined in: [types/generate.ts:290](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L290)

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/generate.ts:292](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L292)

AbortSignal for external cancellation of the AI call

---

### disableTools?

> `optional` **disableTools?**: `boolean`

Defined in: [types/generate.ts:310](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L310)

Disable tool execution (including built-in tools)

#### Required

For Google Gemini providers when using schemas
Google Vertex AI and Google AI Studio require this flag when using
structured output (schemas) due to Google API limitations.

#### Example

```typescript
// Required for Google providers with schemas
await neurolink.generate({
  schema: MySchema,
  provider: "vertex",
  disableTools: true,
});
```

---

### toolFilter?

> `optional` **toolFilter?**: `string`[]

Defined in: [types/generate.ts:313](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L313)

Include only these tools by name (whitelist). If set, only matching tools are available.

---

### excludeTools?

> `optional` **excludeTools?**: `string`[]

Defined in: [types/generate.ts:316](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L316)

Exclude these tools by name (blacklist). Applied after toolFilter.

---

### skipToolPromptInjection?

> `optional` **skipToolPromptInjection?**: `boolean`

Defined in: [types/generate.ts:324](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L324)

Skip injecting tool schemas into the system prompt.
When true, tools are ONLY passed natively via the provider's `tools` parameter,
avoiding duplicate tool definitions (~30K tokens savings per call).
Default: false (backward compatible — tool schemas are injected into system prompt).

---

### disableToolCache?

> `optional` **disableToolCache?**: `boolean`

Defined in: [types/generate.ts:327](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L327)

Disable tool result caching for this request (overrides global mcp.cache.enabled)

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Defined in: [types/generate.ts:330](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L330)

Maximum number of tool execution steps (default: 200)

---

### toolChoice?

> `optional` **toolChoice?**: `ToolChoice`\<`Record`\<`string`, `Tool`\>\>

Defined in: [types/generate.ts:345](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L345)

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

Defined in: [types/generate.ts:370](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L370)

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

### enableEvaluation?

> `optional` **enableEvaluation?**: `boolean`

Defined in: [types/generate.ts:385](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L385)

---

### enableAnalytics?

> `optional` **enableAnalytics?**: `boolean`

Defined in: [types/generate.ts:386](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L386)

---

### context?

> `optional` **context?**: [`StandardRecord`](StandardRecord.md)

Defined in: [types/generate.ts:387](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L387)

---

### evaluationDomain?

> `optional` **evaluationDomain?**: `string`

Defined in: [types/generate.ts:390](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L390)

---

### toolUsageContext?

> `optional` **toolUsageContext?**: `string`

Defined in: [types/generate.ts:391](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L391)

---

### ~~conversationHistory?~~

> `optional` **conversationHistory?**: `object`[]

Defined in: [types/generate.ts:398](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L398)

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

Defined in: [types/generate.ts:406](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L406)

Previous conversation as a ChatMessage array.
Messages are injected as proper multi-turn conversation history before the current prompt,
so the AI model sees them as real prior exchanges (not text dumped into the prompt).
Used by task continuation mode and available to external callers.

---

### factoryConfig?

> `optional` **factoryConfig?**: `object`

Defined in: [types/generate.ts:409](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L409)

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

Defined in: [types/generate.ts:423](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L423)

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

Defined in: [types/generate.ts:432](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L432)

---

### workflowConfig?

> `optional` **workflowConfig?**: [`WorkflowConfig`](WorkflowConfig.md)

Defined in: [types/generate.ts:433](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L433)

---

### rag?

> `optional` **rag?**: [`RAGConfig`](RAGConfig.md)

Defined in: [types/generate.ts:467](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L467)

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

Defined in: [types/generate.ts:482](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L482)

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

Defined in: [types/generate.ts:489](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L489)

Optional request identifier for observability and log correlation.
When provided, this ID is forwarded to spans, logs, and telemetry so
callers can correlate generation traces back to their own request lifecycle.

---

### middleware?

> `optional` **middleware?**: [`MiddlewareFactoryOptions`](MiddlewareFactoryOptions.md)

Defined in: [types/generate.ts:504](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L504)

Per-call middleware configuration.

---

### onFinish?

> `optional` **onFinish?**: [`OnFinishCallback`](OnFinishCallback.md)

Defined in: [types/generate.ts:507](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L507)

Callback invoked when generation completes successfully.

---

### onError?

> `optional` **onError?**: [`OnErrorCallback`](OnErrorCallback.md)

Defined in: [types/generate.ts:510](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L510)

Callback invoked when generation encounters an error.

---

### requestContext?

> `optional` **requestContext?**: `Record`\<`string`, `unknown`\>

Defined in: [types/generate.ts:513](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L513)

Pre-validated user context for the request

---

### auth?

> `optional` **auth?**: `object`

Defined in: [types/generate.ts:516](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L516)

Raw auth token — validated by configured auth provider

#### token

> **token**: `string`

---

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)

Defined in: [types/generate.ts:523](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L523)

Per-provider credential overrides for this request.
Overrides instance-level credentials set in `new NeuroLink({ credentials })`.
Unset providers fall through to instance credentials, then environment variables.

---

### providerFallback?

> `optional` **providerFallback?**: (`error`) => `Promise`\<\{ `provider?`: `string`; `model?`: `string`; \} \| `null`\>

Defined in: [types/generate.ts:529](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L529)

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

Defined in: [types/generate.ts:537](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L537)

Curator P2-3: per-call ordered model chain. Overrides any
instance-level `modelChain`. Tried in order on model-access-denied.

---

### memory?

> `optional` **memory?**: `object`

Defined in: [types/generate.ts:547](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L547)

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
