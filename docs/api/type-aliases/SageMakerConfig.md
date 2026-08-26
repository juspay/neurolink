[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerConfig

# Type Alias: SageMakerConfig

> **SageMakerConfig** = `object`

Defined in: [types/providers.ts:1374](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1374)

AWS configuration options for SageMaker client

## Properties

### region

> **region**: `string`

Defined in: [types/providers.ts:1376](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1376)

AWS region for SageMaker service

---

### accessKeyId

> **accessKeyId**: `string`

Defined in: [types/providers.ts:1378](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1378)

AWS access key ID

---

### secretAccessKey

> **secretAccessKey**: `string`

Defined in: [types/providers.ts:1380](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1380)

AWS secret access key

---

### sessionToken?

> `optional` **sessionToken?**: `string`

Defined in: [types/providers.ts:1382](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1382)

AWS session token (optional, for temporary credentials)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:1384](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1384)

Request timeout in milliseconds

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/providers.ts:1386](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1386)

Maximum number of retry attempts

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1388](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1388)

Custom SageMaker endpoint URL (optional)
