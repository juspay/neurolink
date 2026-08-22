[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleOperationResponse

# Type Alias: GoogleOperationResponse

> **GoogleOperationResponse** = `object`

Defined in: [types/stt.ts:526](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L526)

## Properties

### name

> **name**: `string`

Defined in: [types/stt.ts:527](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L527)

---

### done

> **done**: `boolean`

Defined in: [types/stt.ts:528](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L528)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/stt.ts:529](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L529)

#### progressPercent?

> `optional` **progressPercent?**: `number`

#### startTime?

> `optional` **startTime?**: `string`

#### lastUpdateTime?

> `optional` **lastUpdateTime?**: `string`

---

### response?

> `optional` **response?**: [`GoogleLongRunningRecognizeResponse`](GoogleLongRunningRecognizeResponse.md)

Defined in: [types/stt.ts:534](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L534)

---

### error?

> `optional` **error?**: `object`

Defined in: [types/stt.ts:535](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L535)

#### code

> **code**: `number`

#### message

> **message**: `string`
