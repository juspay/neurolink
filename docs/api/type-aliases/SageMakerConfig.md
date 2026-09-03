[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerConfig

# Type Alias: SageMakerConfig

> **SageMakerConfig** = `object`

Defined in: [types/providers.ts:1385](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1385)

AWS configuration options for SageMaker client

## Properties

### region

> **region**: `string`

Defined in: [types/providers.ts:1387](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1387)

AWS region for SageMaker service

---

### accessKeyId

> **accessKeyId**: `string`

Defined in: [types/providers.ts:1389](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1389)

AWS access key ID

---

### secretAccessKey

> **secretAccessKey**: `string`

Defined in: [types/providers.ts:1391](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1391)

AWS secret access key

---

### sessionToken?

> `optional` **sessionToken?**: `string`

Defined in: [types/providers.ts:1393](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1393)

AWS session token (optional, for temporary credentials)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:1395](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1395)

Request timeout in milliseconds

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/providers.ts:1397](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1397)

Maximum number of retry attempts

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1399](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1399)

Custom SageMaker endpoint URL (optional)
