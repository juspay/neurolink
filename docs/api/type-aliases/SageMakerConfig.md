[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerConfig

# Type Alias: SageMakerConfig

> **SageMakerConfig** = `object`

Defined in: [types/providers.ts:1402](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1402)

AWS configuration options for SageMaker client

## Properties

### region

> **region**: `string`

Defined in: [types/providers.ts:1404](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1404)

AWS region for SageMaker service

---

### accessKeyId

> **accessKeyId**: `string`

Defined in: [types/providers.ts:1406](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1406)

AWS access key ID

---

### secretAccessKey

> **secretAccessKey**: `string`

Defined in: [types/providers.ts:1408](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1408)

AWS secret access key

---

### sessionToken?

> `optional` **sessionToken?**: `string`

Defined in: [types/providers.ts:1410](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1410)

AWS session token (optional, for temporary credentials)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:1412](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1412)

Request timeout in milliseconds

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/providers.ts:1414](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1414)

Maximum number of retry attempts

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1416](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1416)

Custom SageMaker endpoint URL (optional)
