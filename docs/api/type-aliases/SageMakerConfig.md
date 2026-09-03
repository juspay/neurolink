[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerConfig

# Type Alias: SageMakerConfig

> **SageMakerConfig** = `object`

Defined in: [types/providers.ts:1395](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1395)

AWS configuration options for SageMaker client

## Properties

### region

> **region**: `string`

Defined in: [types/providers.ts:1397](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1397)

AWS region for SageMaker service

---

### accessKeyId

> **accessKeyId**: `string`

Defined in: [types/providers.ts:1399](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1399)

AWS access key ID

---

### secretAccessKey

> **secretAccessKey**: `string`

Defined in: [types/providers.ts:1401](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1401)

AWS secret access key

---

### sessionToken?

> `optional` **sessionToken?**: `string`

Defined in: [types/providers.ts:1403](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1403)

AWS session token (optional, for temporary credentials)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:1405](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1405)

Request timeout in milliseconds

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/providers.ts:1407](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1407)

Maximum number of retry attempts

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1409](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1409)

Custom SageMaker endpoint URL (optional)
