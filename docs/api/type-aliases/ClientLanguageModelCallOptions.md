[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientLanguageModelCallOptions

# Type Alias: ClientLanguageModelCallOptions

> **ClientLanguageModelCallOptions** = `object`

Defined in: [types/client.ts:854](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L854)

Language model call options

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/client.ts:856](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L856)

Input prompt

---

### system?

> `optional` **system?**: `string`

Defined in: [types/client.ts:858](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L858)

System prompt

---

### messages?

> `optional` **messages?**: `object`[]

Defined in: [types/client.ts:860](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L860)

Messages for conversation

#### role

> **role**: `"user"` \| `"assistant"` \| `"system"`

#### content

> **content**: `string`

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/client.ts:865](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L865)

Temperature

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/client.ts:867](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L867)

Maximum tokens

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/client.ts:869](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L869)

Stop sequences

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/client.ts:871](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L871)

Abort signal
