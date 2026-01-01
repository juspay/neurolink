[**NeuroLink API Reference v8.26.1**](../README.md)

---

[NeuroLink API Reference](../globals.md) / TextGenerationOptions

# Type Alias: TextGenerationOptions

> **TextGenerationOptions** = `object`

Defined in: [types/generateTypes.ts:435](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L435)

Text generation options type (consolidated from core types)

## Properties

### prompt?

> `optional` **prompt**: `string`

Defined in: [types/generateTypes.ts:436](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L436)

---

### input?

> `optional` **input**: `object`

Defined in: [types/generateTypes.ts:437](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L437)

#### text

> **text**: `string`

---

### provider?

> `optional` **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

Defined in: [types/generateTypes.ts:438](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L438)

---

### model?

> `optional` **model**: `string`

Defined in: [types/generateTypes.ts:439](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L439)

---

### region?

> `optional` **region**: `string`

Defined in: [types/generateTypes.ts:440](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L440)

---

### temperature?

> `optional` **temperature**: `number`

Defined in: [types/generateTypes.ts:441](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L441)

---

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [types/generateTypes.ts:442](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L442)

---

### systemPrompt?

> `optional` **systemPrompt**: `string`

Defined in: [types/generateTypes.ts:443](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L443)

---

### schema?

> `optional` **schema**: `ZodUnknownSchema` \| `Schema`\<`unknown`\>

Defined in: [types/generateTypes.ts:444](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L444)

---

### output?

> `optional` **output**: `object`

Defined in: [types/generateTypes.ts:445](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L445)

#### format?

> `optional` **format**: `"text"` \| `"structured"` \| `"json"`

---

### tools?

> `optional` **tools**: `Record`\<`string`, `Tool`\>

Defined in: [types/generateTypes.ts:446](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L446)

---

### timeout?

> `optional` **timeout**: `number` \| `string`

Defined in: [types/generateTypes.ts:447](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L447)

---

### disableTools?

> `optional` **disableTools**: `boolean`

Defined in: [types/generateTypes.ts:448](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L448)

---

### maxSteps?

> `optional` **maxSteps**: `number`

Defined in: [types/generateTypes.ts:449](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L449)

---

### tts?

> `optional` **tts**: `TTSOptions`

Defined in: [types/generateTypes.ts:480](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L480)

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

Defined in: [types/generateTypes.ts:483](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L483)

---

### enableAnalytics?

> `optional` **enableAnalytics**: `boolean`

Defined in: [types/generateTypes.ts:484](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L484)

---

### context?

> `optional` **context**: `Record`\<`string`, `JsonValue`\>

Defined in: [types/generateTypes.ts:485](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L485)

---

### evaluationDomain?

> `optional` **evaluationDomain**: `string`

Defined in: [types/generateTypes.ts:488](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L488)

---

### toolUsageContext?

> `optional` **toolUsageContext**: `string`

Defined in: [types/generateTypes.ts:489](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L489)

---

### conversationHistory?

> `optional` **conversationHistory**: `object`[]

Defined in: [types/generateTypes.ts:490](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L490)

#### role

> **role**: `string`

#### content

> **content**: `string`

---

### conversationMessages?

> `optional` **conversationMessages**: `ChatMessage`[]

Defined in: [types/generateTypes.ts:493](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L493)

---

### conversationMemoryConfig?

> `optional` **conversationMemoryConfig**: `Partial`\<`ConversationMemoryConfig`\>

Defined in: [types/generateTypes.ts:496](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L496)

---

### originalPrompt?

> `optional` **originalPrompt**: `string`

Defined in: [types/generateTypes.ts:497](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L497)

---

### middleware?

> `optional` **middleware**: [`MiddlewareFactoryOptions`](MiddlewareFactoryOptions.md)

Defined in: [types/generateTypes.ts:500](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L500)

---

### expectedOutcome?

> `optional` **expectedOutcome**: `string`

Defined in: [types/generateTypes.ts:503](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L503)

---

### evaluationCriteria?

> `optional` **evaluationCriteria**: `string`[]

Defined in: [types/generateTypes.ts:504](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L504)

---

### csvOptions?

> `optional` **csvOptions**: `object`

Defined in: [types/generateTypes.ts:507](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L507)

#### maxRows?

> `optional` **maxRows**: `number`

#### formatStyle?

> `optional` **formatStyle**: `"raw"` \| `"markdown"` \| `"json"`

#### includeHeaders?

> `optional` **includeHeaders**: `boolean`

---

### enableSummarization?

> `optional` **enableSummarization**: `boolean`

Defined in: [types/generateTypes.ts:513](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L513)

---

### thinking?

> `optional` **thinking**: `boolean`

Defined in: [types/generateTypes.ts:570](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L570)

Enable extended thinking capability (simplified option).
Equivalent to `thinkingConfig.enabled = true`.
Works with both Anthropic and Gemini 3 models.

---

### thinkingBudget?

> `optional` **thinkingBudget**: `number`

Defined in: [types/generateTypes.ts:577](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L577)

Token budget for thinking (Anthropic models only).
Equivalent to `thinkingConfig.budgetTokens`.
Range: 5000-100000 tokens. Ignored for Gemini models.

---

### thinkingLevel?

> `optional` **thinkingLevel**: `"minimal"` \| `"low"` \| `"medium"` \| `"high"`

Defined in: [types/generateTypes.ts:588](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L588)

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

Defined in: [types/generateTypes.ts:596](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/types/generateTypes.ts#L596)

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
