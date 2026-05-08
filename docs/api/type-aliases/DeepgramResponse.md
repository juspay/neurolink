[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / DeepgramResponse

# Type Alias: DeepgramResponse

> **DeepgramResponse** = `object`

Defined in: [types/stt.ts:479](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L479)

## Properties

### metadata

> **metadata**: `object`

Defined in: [types/stt.ts:480](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L480)

#### request_id

> **request_id**: `string`

#### transaction_key?

> `optional` **transaction_key?**: `string`

#### sha256?

> `optional` **sha256?**: `string`

#### created

> **created**: `string`

#### duration

> **duration**: `number`

#### channels

> **channels**: `number`

#### models

> **models**: `string`[]

#### model_info?

> `optional` **model_info?**: `Record`\<`string`, \{ `name`: `string`; `version`: `string`; \}\>

---

### results

> **results**: [`DeepgramResult`](DeepgramResult.md)

Defined in: [types/stt.ts:490](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L490)
