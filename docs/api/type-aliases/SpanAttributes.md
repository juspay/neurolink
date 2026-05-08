[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpanAttributes

# Type Alias: SpanAttributes

> **SpanAttributes** = `object`

Defined in: [types/span.ts:107](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L107)

Span attributes with AI-specific fields

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### service.name?

> `optional` **service.name?**: `string`

Defined in: [types/span.ts:109](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L109)

---

### service.version?

> `optional` **service.version?**: `string`

Defined in: [types/span.ts:110](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L110)

---

### deployment.environment?

> `optional` **deployment.environment?**: `string`

Defined in: [types/span.ts:111](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L111)

---

### user.id?

> `optional` **user.id?**: `string`

Defined in: [types/span.ts:114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L114)

---

### session.id?

> `optional` **session.id?**: `string`

Defined in: [types/span.ts:115](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L115)

---

### ai.provider?

> `optional` **ai.provider?**: `string`

Defined in: [types/span.ts:118](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L118)

---

### ai.model?

> `optional` **ai.model?**: `string`

Defined in: [types/span.ts:119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L119)

---

### ai.model.version?

> `optional` **ai.model.version?**: `string`

Defined in: [types/span.ts:120](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L120)

---

### ai.tokens.input?

> `optional` **ai.tokens.input?**: `number`

Defined in: [types/span.ts:123](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L123)

---

### ai.tokens.output?

> `optional` **ai.tokens.output?**: `number`

Defined in: [types/span.ts:124](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L124)

---

### ai.tokens.total?

> `optional` **ai.tokens.total?**: `number`

Defined in: [types/span.ts:125](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L125)

---

### ai.tokens.cache_read?

> `optional` **ai.tokens.cache_read?**: `number`

Defined in: [types/span.ts:126](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L126)

---

### ai.tokens.cache_creation?

> `optional` **ai.tokens.cache_creation?**: `number`

Defined in: [types/span.ts:127](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L127)

---

### ai.tokens.reasoning?

> `optional` **ai.tokens.reasoning?**: `number`

Defined in: [types/span.ts:128](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L128)

---

### ai.cost.input?

> `optional` **ai.cost.input?**: `number`

Defined in: [types/span.ts:131](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L131)

---

### ai.cost.output?

> `optional` **ai.cost.output?**: `number`

Defined in: [types/span.ts:132](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L132)

---

### ai.cost.total?

> `optional` **ai.cost.total?**: `number`

Defined in: [types/span.ts:133](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L133)

---

### ai.cost.currency?

> `optional` **ai.cost.currency?**: `string`

Defined in: [types/span.ts:134](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L134)

---

### ai.temperature?

> `optional` **ai.temperature?**: `number`

Defined in: [types/span.ts:137](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L137)

---

### ai.max_tokens?

> `optional` **ai.max_tokens?**: `number`

Defined in: [types/span.ts:138](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L138)

---

### ai.top_p?

> `optional` **ai.top_p?**: `number`

Defined in: [types/span.ts:139](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L139)

---

### ai.stop_sequences?

> `optional` **ai.stop_sequences?**: `string`[]

Defined in: [types/span.ts:140](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L140)

---

### tool.name?

> `optional` **tool.name?**: `string`

Defined in: [types/span.ts:143](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L143)

---

### tool.server?

> `optional` **tool.server?**: `string`

Defined in: [types/span.ts:144](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L144)

---

### tool.success?

> `optional` **tool.success?**: `boolean`

Defined in: [types/span.ts:145](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L145)

---

### error.type?

> `optional` **error.type?**: `string`

Defined in: [types/span.ts:148](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L148)

---

### error.message?

> `optional` **error.message?**: `string`

Defined in: [types/span.ts:149](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L149)

---

### error.stack?

> `optional` **error.stack?**: `string`

Defined in: [types/span.ts:150](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L150)

---

### error?

> `optional` **error?**: `boolean`

Defined in: [types/span.ts:151](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L151)

---

### input?

> `optional` **input?**: `unknown`

Defined in: [types/span.ts:154](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L154)

---

### output?

> `optional` **output?**: `unknown`

Defined in: [types/span.ts:155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L155)

---

### expected?

> `optional` **expected?**: `unknown`

Defined in: [types/span.ts:156](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L156)

---

### scores?

> `optional` **scores?**: `Record`\<`string`, `number`\>

Defined in: [types/span.ts:157](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L157)
