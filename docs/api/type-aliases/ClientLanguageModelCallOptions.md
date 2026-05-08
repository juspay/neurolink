[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientLanguageModelCallOptions

# Type Alias: ClientLanguageModelCallOptions

> **ClientLanguageModelCallOptions** = `object`

Defined in: [types/client.ts:854](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L854)

Language model call options

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/client.ts:856](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L856)

Input prompt

---

### system?

> `optional` **system?**: `string`

Defined in: [types/client.ts:858](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L858)

System prompt

---

### messages?

> `optional` **messages?**: `object`[]

Defined in: [types/client.ts:860](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L860)

Messages for conversation

#### role

> **role**: `"user"` \| `"assistant"` \| `"system"`

#### content

> **content**: `string`

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/client.ts:865](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L865)

Temperature

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/client.ts:867](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L867)

Maximum tokens

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/client.ts:869](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L869)

Stop sequences

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/client.ts:871](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L871)

Abort signal
