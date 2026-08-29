[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchInferenceConfig

# Type Alias: BatchInferenceConfig

> **BatchInferenceConfig** = `object`

Defined in: [types/providers.ts:1737](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1737)

Batch inference job configuration

## Properties

### inputS3Uri

> **inputS3Uri**: `string`

Defined in: [types/providers.ts:1739](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1739)

Input S3 location

---

### outputS3Uri

> **outputS3Uri**: `string`

Defined in: [types/providers.ts:1741](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1741)

Output S3 location

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1743](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1743)

SageMaker model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1745](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1745)

Instance type for batch job

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1747](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1747)

Instance count for batch job

---

### maxPayloadInMB?

> `optional` **maxPayloadInMB?**: `number`

Defined in: [types/providers.ts:1749](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1749)

Maximum payload size in MB

---

### batchStrategy?

> `optional` **batchStrategy?**: `"MultiRecord"` \| `"SingleRecord"`

Defined in: [types/providers.ts:1751](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1751)

Batch strategy
