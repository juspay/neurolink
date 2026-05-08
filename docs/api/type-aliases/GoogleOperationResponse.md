[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleOperationResponse

# Type Alias: GoogleOperationResponse

> **GoogleOperationResponse** = `object`

Defined in: [types/stt.ts:526](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L526)

## Properties

### name

> **name**: `string`

Defined in: [types/stt.ts:527](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L527)

---

### done

> **done**: `boolean`

Defined in: [types/stt.ts:528](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L528)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/stt.ts:529](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L529)

#### progressPercent?

> `optional` **progressPercent?**: `number`

#### startTime?

> `optional` **startTime?**: `string`

#### lastUpdateTime?

> `optional` **lastUpdateTime?**: `string`

---

### response?

> `optional` **response?**: [`GoogleLongRunningRecognizeResponse`](GoogleLongRunningRecognizeResponse.md)

Defined in: [types/stt.ts:534](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L534)

---

### error?

> `optional` **error?**: `object`

Defined in: [types/stt.ts:535](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L535)

#### code

> **code**: `number`

#### message

> **message**: `string`
