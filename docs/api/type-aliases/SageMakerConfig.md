[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerConfig

# Type Alias: SageMakerConfig

> **SageMakerConfig** = `object`

Defined in: [types/providers.ts:1443](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1443)

AWS configuration options for SageMaker client

## Properties

### region

> **region**: `string`

Defined in: [types/providers.ts:1445](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1445)

AWS region for SageMaker service

---

### accessKeyId

> **accessKeyId**: `string`

Defined in: [types/providers.ts:1447](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1447)

AWS access key ID

---

### secretAccessKey

> **secretAccessKey**: `string`

Defined in: [types/providers.ts:1449](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1449)

AWS secret access key

---

### sessionToken?

> `optional` **sessionToken?**: `string`

Defined in: [types/providers.ts:1451](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1451)

AWS session token (optional, for temporary credentials)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:1453](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1453)

Request timeout in milliseconds

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/providers.ts:1455](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1455)

Maximum number of retry attempts

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1457](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1457)

Custom SageMaker endpoint URL (optional)
