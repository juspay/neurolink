[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerConfig

# Type Alias: SageMakerConfig

> **SageMakerConfig** = `object`

Defined in: [types/providers.ts:1465](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1465)

AWS configuration options for SageMaker client

## Properties

### region

> **region**: `string`

Defined in: [types/providers.ts:1467](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1467)

AWS region for SageMaker service

---

### accessKeyId

> **accessKeyId**: `string`

Defined in: [types/providers.ts:1469](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1469)

AWS access key ID

---

### secretAccessKey

> **secretAccessKey**: `string`

Defined in: [types/providers.ts:1471](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1471)

AWS secret access key

---

### sessionToken?

> `optional` **sessionToken?**: `string`

Defined in: [types/providers.ts:1473](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1473)

AWS session token (optional, for temporary credentials)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:1475](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1475)

Request timeout in milliseconds

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/providers.ts:1477](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1477)

Maximum number of retry attempts

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1479](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1479)

Custom SageMaker endpoint URL (optional)
