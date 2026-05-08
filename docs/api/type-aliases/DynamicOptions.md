[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / DynamicOptions

# Type Alias: DynamicOptions

> **DynamicOptions** = `object`

Defined in: [types/dynamic.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L58)

Dynamic options for generate() and stream() — pass functions
instead of static values for context-aware resolution.

## Properties

### model?

> `optional` **model?**: [`DynamicArgument`](DynamicArgument.md)\<`string`\>

Defined in: [types/dynamic.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L59)

---

### provider?

> `optional` **provider?**: [`DynamicArgument`](DynamicArgument.md)\<[`AIProviderName`](../enumerations/AIProviderName.md) \| `string`\>

Defined in: [types/dynamic.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L60)

---

### temperature?

> `optional` **temperature?**: [`DynamicArgument`](DynamicArgument.md)\<`number`\>

Defined in: [types/dynamic.ts:61](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L61)

---

### maxTokens?

> `optional` **maxTokens?**: [`DynamicArgument`](DynamicArgument.md)\<`number`\>

Defined in: [types/dynamic.ts:62](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L62)

---

### systemPrompt?

> `optional` **systemPrompt?**: [`DynamicArgument`](DynamicArgument.md)\<`string`\>

Defined in: [types/dynamic.ts:63](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L63)

---

### tools?

> `optional` **tools?**: [`DynamicArgument`](DynamicArgument.md)\<`string`[]\>

Defined in: [types/dynamic.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L70)

Resolves to a `string[]` of tool names to enable.
The resolved array is merged into `enabledToolNames` (and from there
into `toolFilter`) — it does NOT replace `GenerateOptions.tools`,
which is a `Record<string, Tool>` map of tool definitions.

---

### timeout?

> `optional` **timeout?**: [`DynamicArgument`](DynamicArgument.md)\<`number`\>

Defined in: [types/dynamic.ts:71](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L71)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`DynamicArgument`](DynamicArgument.md)\<`"minimal"` \| `"low"` \| `"medium"` \| `"high"`\>

Defined in: [types/dynamic.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L72)

---

### disableTools?

> `optional` **disableTools?**: [`DynamicArgument`](DynamicArgument.md)\<`boolean`\>

Defined in: [types/dynamic.ts:73](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L73)

---

### enableAnalytics?

> `optional` **enableAnalytics?**: [`DynamicArgument`](DynamicArgument.md)\<`boolean`\>

Defined in: [types/dynamic.ts:74](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L74)

---

### enableEvaluation?

> `optional` **enableEvaluation?**: [`DynamicArgument`](DynamicArgument.md)\<`boolean`\>

Defined in: [types/dynamic.ts:75](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L75)

---

### input

> **input**: `object`

Defined in: [types/dynamic.ts:76](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L76)

#### text

> **text**: `string`

#### images?

> `optional` **images?**: (`Buffer` \| `string`)[]

#### files?

> `optional` **files?**: (`Buffer` \| `string`)[]

---

### dynamicContext?

> `optional` **dynamicContext?**: `Record`\<`string`, `unknown`\>

Defined in: [types/dynamic.ts:88](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/dynamic.ts#L88)

Context passed to dynamic resolver functions — any shape you want.

This is intentionally separate from `GenerateOptions.context` (which is
for telemetry/tracing metadata). If your resolvers need values from
telemetry context (sessionId, userId, etc.), pass them here as well.
