[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextGenerationOptions

# Type Alias: TextGenerationOptions

> **TextGenerationOptions** = `object`

Defined in: [types/generateTypes.ts:437](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L437)

Text generation options type (consolidated from core types)
Extended to support video generation mode

## Properties

### prompt?

> `optional` **prompt**: `string`

Defined in: [types/generateTypes.ts:438](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L438)

---

### input?

> `optional` **input**: `object`

Defined in: [types/generateTypes.ts:448](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L448)

Alternative input format for multimodal SDK operations.

NOTE: This field is only used by the higher-level `generate()` API
(NeuroLink.generate, BaseProvider.generate). Legacy `generateText()`
callers must still use the `prompt` field directly.

Supports text, images, and other multimodal inputs.

#### text

> **text**: `string`

#### images?

> `optional` **images**: (`Buffer` \| `string` \| `ImageWithAltText`)[]

Images to include in the request.
For video generation, the first image is used as the source frame.

#### pdfFiles?

> `optional` **pdfFiles**: (`Buffer` \| `string`)[]

---

### provider?

> `optional` **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

Defined in: [types/generateTypes.ts:457](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L457)

---

### model?

> `optional` **model**: `string`

Defined in: [types/generateTypes.ts:458](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L458)

---

### region?

> `optional` **region**: `string`

Defined in: [types/generateTypes.ts:459](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L459)

---

### temperature?

> `optional` **temperature**: `number`

Defined in: [types/generateTypes.ts:460](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L460)

---

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [types/generateTypes.ts:461](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L461)

---

### systemPrompt?

> `optional` **systemPrompt**: `string`

Defined in: [types/generateTypes.ts:462](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L462)

---

### schema?

> `optional` **schema**: `ZodUnknownSchema` \| `Schema`\<`unknown`\>

Defined in: [types/generateTypes.ts:463](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L463)

---

### output?

> `optional` **output**: `object`

Defined in: [types/generateTypes.ts:475](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L475)

Output configuration options

#### format?

> `optional` **format**: `"text"` \| `"structured"` \| `"json"`

#### mode?

> `optional` **mode**: `"text"` \| `"video"`

Output mode - determines the type of content generated

- "text": Standard text generation (default)
- "video": Video generation using models like Veo 3.1

#### video?

> `optional` **video**: `VideoOutputOptions`

Video generation configuration (used when mode is "video")

#### Example

```typescript
output: {
  mode: "video",
  video: { resolution: "1080p", length: 8 }
}
```

---

### tools?

> `optional` **tools**: `Record`\<`string`, `Tool`\>

Defined in: [types/generateTypes.ts:488](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L488)

---

### timeout?

> `optional` **timeout**: `number` \| `string`

Defined in: [types/generateTypes.ts:489](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L489)

---

### disableTools?

> `optional` **disableTools**: `boolean`

Defined in: [types/generateTypes.ts:490](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L490)

---

### maxSteps?

> `optional` **maxSteps**: `number`

Defined in: [types/generateTypes.ts:491](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L491)

---

### tts?

> `optional` **tts**: `TTSOptions`

Defined in: [types/generateTypes.ts:522](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L522)

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

### enableEvaluation?

> `optional` **enableEvaluation**: `boolean`

Defined in: [types/generateTypes.ts:525](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L525)

---

### enableAnalytics?

> `optional` **enableAnalytics**: `boolean`

Defined in: [types/generateTypes.ts:526](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L526)

---

### context?

> `optional` **context**: `Record`\<`string`, `JsonValue`\>

Defined in: [types/generateTypes.ts:527](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L527)

---

### evaluationDomain?

> `optional` **evaluationDomain**: `string`

Defined in: [types/generateTypes.ts:530](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L530)

---

### toolUsageContext?

> `optional` **toolUsageContext**: `string`

Defined in: [types/generateTypes.ts:531](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L531)

---

### conversationHistory?

> `optional` **conversationHistory**: `object`[]

Defined in: [types/generateTypes.ts:532](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L532)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### conversationMessages?

> `optional` **conversationMessages**: `ChatMessage`[]

Defined in: [types/generateTypes.ts:535](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L535)

---

### conversationMemoryConfig?

> `optional` **conversationMemoryConfig**: `Partial`\<`ConversationMemoryConfig`\>

Defined in: [types/generateTypes.ts:538](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L538)

---

### originalPrompt?

> `optional` **originalPrompt**: `string`

Defined in: [types/generateTypes.ts:539](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L539)

---

### middleware?

> `optional` **middleware**: [`MiddlewareFactoryOptions`](MiddlewareFactoryOptions.md)

Defined in: [types/generateTypes.ts:542](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L542)

---

### expectedOutcome?

> `optional` **expectedOutcome**: `string`

Defined in: [types/generateTypes.ts:545](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L545)

---

### evaluationCriteria?

> `optional` **evaluationCriteria**: `string`[]

Defined in: [types/generateTypes.ts:546](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L546)

---

### csvOptions?

> `optional` **csvOptions**: `object`

Defined in: [types/generateTypes.ts:549](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L549)

#### maxRows?

> `optional` **maxRows**: `number`

#### formatStyle?

> `optional` **formatStyle**: `"raw"` \| `"markdown"` \| `"json"`

#### includeHeaders?

> `optional` **includeHeaders**: `boolean`

---

### enableSummarization?

> `optional` **enableSummarization**: `boolean`

Defined in: [types/generateTypes.ts:555](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L555)

---

### thinking?

> `optional` **thinking**: `boolean`

Defined in: [types/generateTypes.ts:612](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L612)

Enable extended thinking capability (simplified option).
Equivalent to `thinkingConfig.enabled = true`.
Works with both Anthropic and Gemini 3 models.

---

### thinkingBudget?

> `optional` **thinkingBudget**: `number`

Defined in: [types/generateTypes.ts:619](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L619)

Token budget for thinking (Anthropic models only).
Equivalent to `thinkingConfig.budgetTokens`.
Range: 5000-100000 tokens. Ignored for Gemini models.

---

### thinkingLevel?

> `optional` **thinkingLevel**: `"minimal"` \| `"low"` \| `"medium"` \| `"high"`

Defined in: [types/generateTypes.ts:630](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L630)

Thinking level for Gemini 3 models only.
Equivalent to `thinkingConfig.thinkingLevel`.

- `minimal` - Near-zero thinking (Flash only)
- `low` - Light reasoning
- `medium` - Balanced reasoning/latency
- `high` - Deep reasoning (Pro default)
  Ignored for Anthropic models.

---

### thinkingConfig?

> `optional` **thinkingConfig**: `object`

Defined in: [types/generateTypes.ts:638](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/types/generateTypes.ts#L638)

Full thinking/reasoning configuration (recommended for SDK usage).
Takes precedence over simplified options (thinking, thinkingBudget, thinkingLevel).

#### enabled?

> `optional` **enabled**: `boolean`

Enable extended thinking. Default: false

#### type?

> `optional` **type**: `"enabled"` \| `"disabled"`

Explicit enable/disable type. Alternative to `enabled` boolean.

#### budgetTokens?

> `optional` **budgetTokens**: `number`

Token budget for thinking (Anthropic: 5000-100000). Ignored for Gemini.

#### thinkingLevel?

> `optional` **thinkingLevel**: `"minimal"` \| `"low"` \| `"medium"` \| `"high"`

Thinking level (Gemini 3: minimal|low|medium|high). Ignored for Anthropic.

#### See

Above documentation for provider-specific behavior and option compatibility.
