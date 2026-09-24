[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerConfig

# Type Alias: SageMakerConfig

> **SageMakerConfig** = `object`

Defined in: [types/providers.ts:1458](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1458)

AWS configuration options for SageMaker client

## Properties

### region

> **region**: `string`

Defined in: [types/providers.ts:1460](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1460)

AWS region for SageMaker service

---

### accessKeyId

> **accessKeyId**: `string`

Defined in: [types/providers.ts:1462](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1462)

AWS access key ID

---

### secretAccessKey

> **secretAccessKey**: `string`

Defined in: [types/providers.ts:1464](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1464)

AWS secret access key

---

### sessionToken?

> `optional` **sessionToken?**: `string`

Defined in: [types/providers.ts:1466](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1466)

AWS session token (optional, for temporary credentials)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:1468](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1468)

Request timeout in milliseconds

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/providers.ts:1470](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1470)

Maximum number of retry attempts

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1472](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1472)

Custom SageMaker endpoint URL (optional)
