[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseSpan

# Type Alias: LangfuseSpan

> **LangfuseSpan** = `object`

Defined in: [types/span.ts:227](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L227)

Langfuse-specific span format

## Properties

### id

> **id**: `string`

Defined in: [types/span.ts:228](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L228)

---

### traceId

> **traceId**: `string`

Defined in: [types/span.ts:229](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L229)

---

### parentObservationId?

> `optional` **parentObservationId?**: `string`

Defined in: [types/span.ts:230](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L230)

---

### name

> **name**: `string`

Defined in: [types/span.ts:231](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L231)

---

### startTime

> **startTime**: `string`

Defined in: [types/span.ts:232](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L232)

---

### endTime?

> `optional` **endTime?**: `string`

Defined in: [types/span.ts:233](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L233)

---

### metadata

> **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [types/span.ts:234](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L234)

---

### level

> **level**: `"DEBUG"` \| `"DEFAULT"` \| `"WARNING"` \| `"ERROR"`

Defined in: [types/span.ts:235](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L235)

---

### statusMessage?

> `optional` **statusMessage?**: `string`

Defined in: [types/span.ts:236](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L236)

---

### input?

> `optional` **input?**: `unknown`

Defined in: [types/span.ts:237](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L237)

---

### output?

> `optional` **output?**: `unknown`

Defined in: [types/span.ts:238](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L238)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/span.ts:239](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L239)

#### promptTokens?

> `optional` **promptTokens?**: `number`

#### completionTokens?

> `optional` **completionTokens?**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`
