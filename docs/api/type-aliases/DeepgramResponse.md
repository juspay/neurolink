[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DeepgramResponse

# Type Alias: DeepgramResponse

> **DeepgramResponse** = `object`

## Properties

### metadata

> **metadata**: `object`

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
