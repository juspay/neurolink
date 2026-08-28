[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchInferenceConfig

# Type Alias: BatchInferenceConfig

> **BatchInferenceConfig** = `object`

Defined in: [types/providers.ts:1727](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1727)

Batch inference job configuration

## Properties

### inputS3Uri

> **inputS3Uri**: `string`

Defined in: [types/providers.ts:1729](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1729)

Input S3 location

---

### outputS3Uri

> **outputS3Uri**: `string`

Defined in: [types/providers.ts:1731](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1731)

Output S3 location

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1733](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1733)

SageMaker model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1735](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1735)

Instance type for batch job

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1737](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1737)

Instance count for batch job

---

### maxPayloadInMB?

> `optional` **maxPayloadInMB?**: `number`

Defined in: [types/providers.ts:1739](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1739)

Maximum payload size in MB

---

### batchStrategy?

> `optional` **batchStrategy?**: `"MultiRecord"` \| `"SingleRecord"`

Defined in: [types/providers.ts:1741](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1741)

Batch strategy
