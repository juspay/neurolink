[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerConfig

# Type Alias: SageMakerConfig

> **SageMakerConfig** = `object`

Defined in: [types/providers.ts:1373](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1373)

AWS configuration options for SageMaker client

## Properties

### region

> **region**: `string`

Defined in: [types/providers.ts:1375](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1375)

AWS region for SageMaker service

---

### accessKeyId

> **accessKeyId**: `string`

Defined in: [types/providers.ts:1377](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1377)

AWS access key ID

---

### secretAccessKey

> **secretAccessKey**: `string`

Defined in: [types/providers.ts:1379](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1379)

AWS secret access key

---

### sessionToken?

> `optional` **sessionToken?**: `string`

Defined in: [types/providers.ts:1381](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1381)

AWS session token (optional, for temporary credentials)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:1383](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1383)

Request timeout in milliseconds

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/providers.ts:1385](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1385)

Maximum number of retry attempts

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1387](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1387)

Custom SageMaker endpoint URL (optional)
