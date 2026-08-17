[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchInferenceConfig

# Type Alias: BatchInferenceConfig

> **BatchInferenceConfig** = `object`

Defined in: [types/providers.ts:1764](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1764)

Batch inference job configuration

## Properties

### inputS3Uri

> **inputS3Uri**: `string`

Defined in: [types/providers.ts:1766](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1766)

Input S3 location

---

### outputS3Uri

> **outputS3Uri**: `string`

Defined in: [types/providers.ts:1768](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1768)

Output S3 location

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1770](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1770)

SageMaker model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1772](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1772)

Instance type for batch job

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1774](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1774)

Instance count for batch job

---

### maxPayloadInMB?

> `optional` **maxPayloadInMB?**: `number`

Defined in: [types/providers.ts:1776](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1776)

Maximum payload size in MB

---

### batchStrategy?

> `optional` **batchStrategy?**: `"MultiRecord"` \| `"SingleRecord"`

Defined in: [types/providers.ts:1778](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1778)

Batch strategy
