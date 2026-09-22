[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchInferenceConfig

# Type Alias: BatchInferenceConfig

> **BatchInferenceConfig** = `object`

Defined in: [types/providers.ts:1803](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1803)

Batch inference job configuration

## Properties

### inputS3Uri

> **inputS3Uri**: `string`

Defined in: [types/providers.ts:1805](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1805)

Input S3 location

---

### outputS3Uri

> **outputS3Uri**: `string`

Defined in: [types/providers.ts:1807](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1807)

Output S3 location

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1809](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1809)

SageMaker model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1811](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1811)

Instance type for batch job

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1813](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1813)

Instance count for batch job

---

### maxPayloadInMB?

> `optional` **maxPayloadInMB?**: `number`

Defined in: [types/providers.ts:1815](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1815)

Maximum payload size in MB

---

### batchStrategy?

> `optional` **batchStrategy?**: `"MultiRecord"` \| `"SingleRecord"`

Defined in: [types/providers.ts:1817](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1817)

Batch strategy
