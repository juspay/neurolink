[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientGenerateRequestOptions

# Type Alias: ClientGenerateRequestOptions

> **ClientGenerateRequestOptions** = `object`

Defined in: [types/client.ts:230](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L230)

Generate request options (client-side version)

## Properties

### input

> **input**: `object`

Defined in: [types/client.ts:232](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L232)

Input for generation

#### text

> **text**: `string`

#### images?

> `optional` **images?**: `string`[]

#### files?

> `optional` **files?**: `string`[]

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/client.ts:238](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L238)

Provider to use

---

### model?

> `optional` **model?**: `string`

Defined in: [types/client.ts:240](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L240)

Model to use

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/client.ts:242](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L242)

Temperature for generation

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/client.ts:244](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L244)

Maximum tokens to generate

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/client.ts:246](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L246)

System prompt

---

### enableTools?

> `optional` **enableTools?**: `boolean`

Defined in: [types/client.ts:248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L248)

Enable tool usage

---

### tools?

> `optional` **tools?**: `string`[]

Defined in: [types/client.ts:250](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L250)

Specific tools to enable

---

### context?

> `optional` **context?**: [`UnknownRecord`](UnknownRecord.md)

Defined in: [types/client.ts:252](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L252)

Context data
