[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingRequestOptions

# Type Alias: StreamingRequestOptions

> **StreamingRequestOptions** = `object`

Defined in: [types/client.ts:1501](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1501)

Streaming request options

## Properties

### input

> **input**: `object` & [`UnknownRecord`](UnknownRecord.md)

Defined in: [types/client.ts:1503](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1503)

Input text or data

#### Type Declaration

##### text

> **text**: `string`

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/client.ts:1505](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1505)

Provider to use

---

### model?

> `optional` **model?**: `string`

Defined in: [types/client.ts:1507](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1507)

Model to use

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/client.ts:1509](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1509)

Temperature

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/client.ts:1511](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1511)

Maximum tokens

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/client.ts:1513](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1513)

System prompt

---

### enableTools?

> `optional` **enableTools?**: `boolean`

Defined in: [types/client.ts:1515](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1515)

Enable tools

---

### context?

> `optional` **context?**: [`UnknownRecord`](UnknownRecord.md)

Defined in: [types/client.ts:1517](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1517)

Context data
