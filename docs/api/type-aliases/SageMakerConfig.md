[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerConfig

# Type Alias: SageMakerConfig

> **SageMakerConfig** = `object`

Defined in: [types/providers.ts:1382](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1382)

AWS configuration options for SageMaker client

## Properties

### region

> **region**: `string`

Defined in: [types/providers.ts:1384](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1384)

AWS region for SageMaker service

---

### accessKeyId

> **accessKeyId**: `string`

Defined in: [types/providers.ts:1386](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1386)

AWS access key ID

---

### secretAccessKey

> **secretAccessKey**: `string`

Defined in: [types/providers.ts:1388](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1388)

AWS secret access key

---

### sessionToken?

> `optional` **sessionToken?**: `string`

Defined in: [types/providers.ts:1390](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1390)

AWS session token (optional, for temporary credentials)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:1392](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1392)

Request timeout in milliseconds

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/providers.ts:1394](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1394)

Maximum number of retry attempts

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1396](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1396)

Custom SageMaker endpoint URL (optional)
