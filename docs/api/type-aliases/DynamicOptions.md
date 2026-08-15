[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DynamicOptions

# Type Alias: DynamicOptions

> **DynamicOptions** = `object`

Defined in: [types/dynamic.ts:59](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L59)

Dynamic options for generate() and stream() — pass functions
instead of static values for context-aware resolution.

## Properties

### useKnowledgeGrounding?

> `optional` **useKnowledgeGrounding?**: `boolean`

Defined in: [types/dynamic.ts:65](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L65)

Opt this call into the knowledge grounding configured on the NeuroLink
instance. This flag is intentionally static because grounding runs before
dynamic arguments are resolved.

---

### knowledgeContext?

> `optional` **knowledgeContext?**: [`KnowledgeRequestScope`](KnowledgeRequestScope.md)

Defined in: [types/dynamic.ts:70](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L70)

Enabled integrations used to scope knowledge retrieval for this turn.
This scope is intentionally static for the same reason.

---

### model?

> `optional` **model?**: [`DynamicArgument`](DynamicArgument.md)\<`string`\>

Defined in: [types/dynamic.ts:71](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L71)

---

### provider?

> `optional` **provider?**: [`DynamicArgument`](DynamicArgument.md)\<[`AIProviderName`](../enumerations/AIProviderName.md) \| `string`\>

Defined in: [types/dynamic.ts:72](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L72)

---

### temperature?

> `optional` **temperature?**: [`DynamicArgument`](DynamicArgument.md)\<`number`\>

Defined in: [types/dynamic.ts:73](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L73)

---

### maxTokens?

> `optional` **maxTokens?**: [`DynamicArgument`](DynamicArgument.md)\<`number`\>

Defined in: [types/dynamic.ts:74](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L74)

---

### systemPrompt?

> `optional` **systemPrompt?**: [`DynamicArgument`](DynamicArgument.md)\<`string`\>

Defined in: [types/dynamic.ts:75](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L75)

---

### tools?

> `optional` **tools?**: [`DynamicArgument`](DynamicArgument.md)\<`string`[]\>

Defined in: [types/dynamic.ts:82](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L82)

Resolves to a `string[]` of tool names to enable.
The resolved array is merged into `enabledToolNames` (and from there
into `toolFilter`) — it does NOT replace `GenerateOptions.tools`,
which is a `Record<string, Tool>` map of tool definitions.

---

### timeout?

> `optional` **timeout?**: [`DynamicArgument`](DynamicArgument.md)\<`number`\>

Defined in: [types/dynamic.ts:83](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L83)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`DynamicArgument`](DynamicArgument.md)\<`"minimal"` \| `"low"` \| `"medium"` \| `"high"`\>

Defined in: [types/dynamic.ts:84](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L84)

---

### disableTools?

> `optional` **disableTools?**: [`DynamicArgument`](DynamicArgument.md)\<`boolean`\>

Defined in: [types/dynamic.ts:85](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L85)

---

### enableAnalytics?

> `optional` **enableAnalytics?**: [`DynamicArgument`](DynamicArgument.md)\<`boolean`\>

Defined in: [types/dynamic.ts:86](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L86)

---

### enableEvaluation?

> `optional` **enableEvaluation?**: [`DynamicArgument`](DynamicArgument.md)\<`boolean`\>

Defined in: [types/dynamic.ts:87](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L87)

---

### input

> **input**: `object`

Defined in: [types/dynamic.ts:88](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L88)

#### text

> **text**: `string`

#### images?

> `optional` **images?**: (`Buffer` \| `string`)[]

#### files?

> `optional` **files?**: (`Buffer` \| `string`)[]

---

### dynamicContext?

> `optional` **dynamicContext?**: `Record`\<`string`, `unknown`\>

Defined in: [types/dynamic.ts:100](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/dynamic.ts#L100)

Context passed to dynamic resolver functions — any shape you want.

This is intentionally separate from `GenerateOptions.context` (which is
for telemetry/tracing metadata). If your resolvers need values from
telemetry context (sessionId, userId, etc.), pass them here as well.
