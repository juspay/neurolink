[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiResponse

# Type Alias: GeminiResponse

> **GeminiResponse** = `object`

Defined in: [types/stt.ts:757](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L757)

## Properties

### setupComplete?

> `optional` **setupComplete?**: `Record`\<`string`, `unknown`\>

Defined in: [types/stt.ts:758](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L758)

---

### serverContent?

> `optional` **serverContent?**: `object`

Defined in: [types/stt.ts:759](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L759)

#### modelTurn?

> `optional` **modelTurn?**: `object`

##### modelTurn.parts

> **parts**: `object`[]

#### turnComplete?

> `optional` **turnComplete?**: `boolean`

#### interrupted?

> `optional` **interrupted?**: `boolean`

---

### toolCall?

> `optional` **toolCall?**: `object`

Defined in: [types/stt.ts:772](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L772)

#### functionCalls

> **functionCalls**: `object`[]

---

### toolCallCancellation?

> `optional` **toolCallCancellation?**: `object`

Defined in: [types/stt.ts:779](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L779)

#### ids

> **ids**: `string`[]
