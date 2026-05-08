[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseSpan

# Type Alias: LangfuseSpan

> **LangfuseSpan** = `object`

Defined in: [types/span.ts:216](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L216)

Langfuse-specific span format

## Properties

### id

> **id**: `string`

Defined in: [types/span.ts:217](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L217)

---

### traceId

> **traceId**: `string`

Defined in: [types/span.ts:218](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L218)

---

### parentObservationId?

> `optional` **parentObservationId?**: `string`

Defined in: [types/span.ts:219](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L219)

---

### name

> **name**: `string`

Defined in: [types/span.ts:220](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L220)

---

### startTime

> **startTime**: `string`

Defined in: [types/span.ts:221](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L221)

---

### endTime?

> `optional` **endTime?**: `string`

Defined in: [types/span.ts:222](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L222)

---

### metadata

> **metadata**: `Record`\<`string`, `unknown`\>

Defined in: [types/span.ts:223](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L223)

---

### level

> **level**: `"DEBUG"` \| `"DEFAULT"` \| `"WARNING"` \| `"ERROR"`

Defined in: [types/span.ts:224](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L224)

---

### statusMessage?

> `optional` **statusMessage?**: `string`

Defined in: [types/span.ts:225](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L225)

---

### input?

> `optional` **input?**: `unknown`

Defined in: [types/span.ts:226](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L226)

---

### output?

> `optional` **output?**: `unknown`

Defined in: [types/span.ts:227](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L227)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/span.ts:228](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L228)

#### promptTokens?

> `optional` **promptTokens?**: `number`

#### completionTokens?

> `optional` **completionTokens?**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`
