[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpanAttributes

# Type Alias: SpanAttributes

> **SpanAttributes** = `object`

Defined in: [types/span.ts:118](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L118)

Span attributes with AI-specific fields

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### service.name?

> `optional` **service.name?**: `string`

Defined in: [types/span.ts:120](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L120)

---

### service.version?

> `optional` **service.version?**: `string`

Defined in: [types/span.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L121)

---

### deployment.environment?

> `optional` **deployment.environment?**: `string`

Defined in: [types/span.ts:122](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L122)

---

### user.id?

> `optional` **user.id?**: `string`

Defined in: [types/span.ts:125](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L125)

---

### session.id?

> `optional` **session.id?**: `string`

Defined in: [types/span.ts:126](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L126)

---

### ai.provider?

> `optional` **ai.provider?**: `string`

Defined in: [types/span.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L129)

---

### ai.model?

> `optional` **ai.model?**: `string`

Defined in: [types/span.ts:130](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L130)

---

### ai.model.version?

> `optional` **ai.model.version?**: `string`

Defined in: [types/span.ts:131](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L131)

---

### ai.tokens.input?

> `optional` **ai.tokens.input?**: `number`

Defined in: [types/span.ts:134](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L134)

---

### ai.tokens.output?

> `optional` **ai.tokens.output?**: `number`

Defined in: [types/span.ts:135](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L135)

---

### ai.tokens.total?

> `optional` **ai.tokens.total?**: `number`

Defined in: [types/span.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L136)

---

### ai.tokens.cache_read?

> `optional` **ai.tokens.cache_read?**: `number`

Defined in: [types/span.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L137)

---

### ai.tokens.cache_creation?

> `optional` **ai.tokens.cache_creation?**: `number`

Defined in: [types/span.ts:138](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L138)

---

### ai.tokens.reasoning?

> `optional` **ai.tokens.reasoning?**: `number`

Defined in: [types/span.ts:139](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L139)

---

### ai.cost.input?

> `optional` **ai.cost.input?**: `number`

Defined in: [types/span.ts:142](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L142)

---

### ai.cost.output?

> `optional` **ai.cost.output?**: `number`

Defined in: [types/span.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L143)

---

### ai.cost.total?

> `optional` **ai.cost.total?**: `number`

Defined in: [types/span.ts:144](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L144)

---

### ai.cost.currency?

> `optional` **ai.cost.currency?**: `string`

Defined in: [types/span.ts:145](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L145)

---

### ai.temperature?

> `optional` **ai.temperature?**: `number`

Defined in: [types/span.ts:148](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L148)

---

### ai.max_tokens?

> `optional` **ai.max_tokens?**: `number`

Defined in: [types/span.ts:149](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L149)

---

### ai.top_p?

> `optional` **ai.top_p?**: `number`

Defined in: [types/span.ts:150](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L150)

---

### ai.stop_sequences?

> `optional` **ai.stop_sequences?**: `string`[]

Defined in: [types/span.ts:151](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L151)

---

### tool.name?

> `optional` **tool.name?**: `string`

Defined in: [types/span.ts:154](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L154)

---

### tool.server?

> `optional` **tool.server?**: `string`

Defined in: [types/span.ts:155](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L155)

---

### tool.success?

> `optional` **tool.success?**: `boolean`

Defined in: [types/span.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L156)

---

### error.type?

> `optional` **error.type?**: `string`

Defined in: [types/span.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L159)

---

### error.message?

> `optional` **error.message?**: `string`

Defined in: [types/span.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L160)

---

### error.stack?

> `optional` **error.stack?**: `string`

Defined in: [types/span.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L161)

---

### error?

> `optional` **error?**: `boolean`

Defined in: [types/span.ts:162](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L162)

---

### input?

> `optional` **input?**: `unknown`

Defined in: [types/span.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L165)

---

### output?

> `optional` **output?**: `unknown`

Defined in: [types/span.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L166)

---

### expected?

> `optional` **expected?**: `unknown`

Defined in: [types/span.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L167)

---

### scores?

> `optional` **scores?**: `Record`\<`string`, `number`\>

Defined in: [types/span.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L168)
