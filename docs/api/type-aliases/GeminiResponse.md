[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiResponse

# Type Alias: GeminiResponse

> **GeminiResponse** = `object`

## Properties

### setupComplete?

> `optional` **setupComplete?**: `Record`\<`string`, `unknown`\>

---

### serverContent?

> `optional` **serverContent?**: `object`

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

#### functionCalls

> **functionCalls**: `object`[]

---

### toolCallCancellation?

> `optional` **toolCallCancellation?**: `object`

#### ids

> **ids**: `string`[]
