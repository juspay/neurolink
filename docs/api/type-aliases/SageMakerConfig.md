[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerConfig

# Type Alias: SageMakerConfig

> **SageMakerConfig** = `object`

Defined in: [types/providers.ts:1407](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1407)

AWS configuration options for SageMaker client

## Properties

### region

> **region**: `string`

Defined in: [types/providers.ts:1409](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1409)

AWS region for SageMaker service

---

### accessKeyId

> **accessKeyId**: `string`

Defined in: [types/providers.ts:1411](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1411)

AWS access key ID

---

### secretAccessKey

> **secretAccessKey**: `string`

Defined in: [types/providers.ts:1413](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1413)

AWS secret access key

---

### sessionToken?

> `optional` **sessionToken?**: `string`

Defined in: [types/providers.ts:1415](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1415)

AWS session token (optional, for temporary credentials)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:1417](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1417)

Request timeout in milliseconds

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/providers.ts:1419](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1419)

Maximum number of retry attempts

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1421](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1421)

Custom SageMaker endpoint URL (optional)
