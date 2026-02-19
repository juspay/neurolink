[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenerateOptions

# Type Alias: GenerateOptions

> **GenerateOptions** = `object`

Defined in: [types/generateTypes.ts:24](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L24)

Generate function options type - Primary method for content generation
Supports multimodal content while maintaining backward compatibility

## Properties

### input

> **input**: `object`

Defined in: [types/generateTypes.ts:25](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L25)

#### text

> **text**: `string`

#### images?

> `optional` **images**: (`Buffer` \| `string` \| `ImageWithAltText`)[]

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

> `optional` **csvFiles**: (`Buffer` \| `string`)[]

#### pdfFiles?

> `optional` **pdfFiles**: (`Buffer` \| `string`)[]

#### videoFiles?

> `optional` **videoFiles**: (`Buffer` \| `string`)[]

#### files?

> `optional` **files**: (`Buffer` \| `string`)[]

#### content?

> `optional` **content**: `Content`[]

---

### output?

> `optional` **output**: `object`

Defined in: [types/generateTypes.ts:72](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L72)

Output configuration options

#### format?

> `optional` **format**: `"text"` \| `"structured"` \| `"json"`

Output format for text generation

#### mode?

> `optional` **mode**: `"text"` \| `"video"`

Output mode - determines the type of content generated

- "text": Standard text generation (default)
- "video": Video generation using models like Veo 3.1

#### video?

> `optional` **video**: `VideoOutputOptions`

Video generation configuration (used when mode is "video")
Requires an input image and text prompt

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

> `optional` **csvOptions**: `object`

Defined in: [types/generateTypes.ts:89](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L89)

#### maxRows?

> `optional` **maxRows**: `number`

#### formatStyle?

> `optional` **formatStyle**: `"raw"` \| `"markdown"` \| `"json"`

#### includeHeaders?

> `optional` **includeHeaders**: `boolean`

---

### videoOptions?

> `optional` **videoOptions**: `object`

Defined in: [types/generateTypes.ts:96](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L96)

#### frames?

> `optional` **frames**: `number`

#### quality?

> `optional` **quality**: `number`

#### format?

> `optional` **format**: `"jpeg"` \| `"png"`

#### transcribeAudio?

> `optional` **transcribeAudio**: `boolean`

---

### tts?

> `optional` **tts**: `TTSOptions`

Defined in: [types/generateTypes.ts:135](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L135)

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

### thinkingConfig?

> `optional` **thinkingConfig**: `object`

Defined in: [types/generateTypes.ts:177](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L177)

Thinking/reasoning configuration for extended thinking models

Enables extended thinking capabilities for supported models.

**Gemini 3 Models** (gemini-3-pro-preview, gemini-3-flash-preview):
Use `thinkingLevel` to control reasoning depth:

- `minimal` - Near-zero thinking (Flash only)
- `low` - Fast reasoning for simple tasks
- `medium` - Balanced reasoning/latency
- `high` - Maximum reasoning depth (default for Pro)

**Anthropic Claude** (claude-3-7-sonnet, etc.):
Use `budgetTokens` to set token budget for thinking.

#### enabled?

> `optional` **enabled**: `boolean`

#### type?

> `optional` **type**: `"enabled"` \| `"disabled"`

#### budgetTokens?

> `optional` **budgetTokens**: `number`

Token budget for thinking (Anthropic models)

#### thinkingLevel?

> `optional` **thinkingLevel**: `"minimal"` \| `"low"` \| `"medium"` \| `"high"`

Thinking level for Gemini 3 models: minimal, low, medium, high

#### Examples

```typescript
const result = await neurolink.generate({
  input: { text: "Solve this complex problem..." },
  provider: "google-ai",
  model: "gemini-3-pro-preview",
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

> `optional` **provider**: [`AIProviderName`](../enumerations/AIProviderName.md) \| `string`

Defined in: [types/generateTypes.ts:187](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L187)

---

### model?

> `optional` **model**: `string`

Defined in: [types/generateTypes.ts:188](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L188)

---

### region?

> `optional` **region**: `string`

Defined in: [types/generateTypes.ts:189](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L189)

---

### temperature?

> `optional` **temperature**: `number`

Defined in: [types/generateTypes.ts:190](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L190)

---

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [types/generateTypes.ts:191](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L191)

---

### systemPrompt?

> `optional` **systemPrompt**: `string`

Defined in: [types/generateTypes.ts:192](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L192)

---

### schema?

> `optional` **schema**: `ValidationSchema`

Defined in: [types/generateTypes.ts:225](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L225)

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

> `optional` **tools**: `Record`\<`string`, `Tool`\>

Defined in: [types/generateTypes.ts:226](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L226)

---

### timeout?

> `optional` **timeout**: `number` \| `string`

Defined in: [types/generateTypes.ts:227](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L227)

---

### disableTools?

> `optional` **disableTools**: `boolean`

Defined in: [types/generateTypes.ts:245](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L245)

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

### maxSteps?

> `optional` **maxSteps**: `number`

Defined in: [types/generateTypes.ts:247](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L247)

Maximum number of tool execution steps (default: 5).

---

### toolChoice?

> `optional` **toolChoice**: `"auto"` \| `"none"` \| `"required"` \| \{ `type`: `"tool"`; `toolName`: `string` \}

Defined in: [types/generateTypes.ts:263](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L263)

Tool choice configuration for the generation.
Controls whether and which tools the model must call.

- `"auto"` (default): the model can choose whether and which tools to call
- `"none"`: no tool calls allowed
- `"required"`: the model must call at least one tool and calls indefinitely until maxSteps is reached and outputs empty string.
- `{ type: "tool", toolName: string }`: the model must and only call the specified tool and calls indefinitely until maxSteps is reached and outputs empty string.

> **Note:** When used without `prepareStep`, this applies to **every step** in the
> `maxSteps` loop. Using `"required"` or `{ type: "tool" }` without `prepareStep`
> will cause infinite tool calls until `maxSteps` is exhausted.

---

### prepareStep?

> `optional` **prepareStep**: (`options`: \{ `steps`: `StepResult`[]; `stepNumber`: `number`; `maxSteps`: `number`; `model`: `LanguageModel` \}) => `PromiseLike`\<\{ `model?`: `LanguageModel`; `toolChoice?`: `ToolChoice`; `experimental_activeTools?`: `string`[] \} \| `undefined`\>

Defined in: [types/generateTypes.ts:288](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L288)

Optional callback that runs before each step in a multi-step generation.
Allows dynamically changing `toolChoice` and available tools per step.

This is the recommended way to enforce specific tool calls on certain steps
while allowing the model freedom on others.

Maps to Vercel AI SDK's `experimental_prepareStep`.

#### Example

```typescript
prepareStep: async ({ stepNumber }) => {
  if (stepNumber === 0) {
    return {
      toolChoice: { type: "tool", toolName: "sequentialThinking" },
    };
  }
  return { toolChoice: "auto" };
};
```

#### See

[SDK Custom Tools Guide — Controlling Tool Execution](../../sdk-custom-tools.md#-controlling-tool-execution)

---

### enableEvaluation?

> `optional` **enableEvaluation**: `boolean`

Defined in: [types/generateTypes.ts:248](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L248)

---

### enableAnalytics?

> `optional` **enableAnalytics**: `boolean`

Defined in: [types/generateTypes.ts:249](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L249)

---

### context?

> `optional` **context**: `StandardRecord`

Defined in: [types/generateTypes.ts:250](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L250)

---

### evaluationDomain?

> `optional` **evaluationDomain**: `string`

Defined in: [types/generateTypes.ts:253](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L253)

---

### toolUsageContext?

> `optional` **toolUsageContext**: `string`

Defined in: [types/generateTypes.ts:254](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L254)

---

### conversationHistory?

> `optional` **conversationHistory**: `object`[]

Defined in: [types/generateTypes.ts:255](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L255)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### factoryConfig?

> `optional` **factoryConfig**: `object`

Defined in: [types/generateTypes.ts:258](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L258)

#### domainType?

> `optional` **domainType**: `string`

#### domainConfig?

> `optional` **domainConfig**: `StandardRecord`

#### enhancementType?

> `optional` **enhancementType**: `"domain-configuration"` \| `"streaming-optimization"` \| `"mcp-integration"` \| `"legacy-migration"` \| `"context-conversion"`

#### preserveLegacyFields?

> `optional` **preserveLegacyFields**: `boolean`

#### validateDomainData?

> `optional` **validateDomainData**: `boolean`

---

### streaming?

> `optional` **streaming**: `object`

Defined in: [types/generateTypes.ts:272](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L272)

#### enabled?

> `optional` **enabled**: `boolean`

#### chunkSize?

> `optional` **chunkSize**: `number`

#### bufferSize?

> `optional` **bufferSize**: `number`

#### enableProgress?

> `optional` **enableProgress**: `boolean`

#### fallbackToGenerate?

> `optional` **fallbackToGenerate**: `boolean`
