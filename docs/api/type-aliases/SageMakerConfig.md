[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerConfig

# Type Alias: SageMakerConfig

> **SageMakerConfig** = `object`

Defined in: [types/providers.ts:1446](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1446)

AWS configuration options for SageMaker client

## Properties

### region

> **region**: `string`

Defined in: [types/providers.ts:1448](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1448)

AWS region for SageMaker service

---

### accessKeyId

> **accessKeyId**: `string`

Defined in: [types/providers.ts:1450](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1450)

AWS access key ID

---

### secretAccessKey

> **secretAccessKey**: `string`

Defined in: [types/providers.ts:1452](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1452)

AWS secret access key

---

### sessionToken?

> `optional` **sessionToken?**: `string`

Defined in: [types/providers.ts:1454](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1454)

AWS session token (optional, for temporary credentials)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:1456](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1456)

Request timeout in milliseconds

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/providers.ts:1458](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1458)

Maximum number of retry attempts

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1460](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1460)

Custom SageMaker endpoint URL (optional)
