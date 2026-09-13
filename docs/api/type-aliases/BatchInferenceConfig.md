[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchInferenceConfig

# Type Alias: BatchInferenceConfig

> **BatchInferenceConfig** = `object`

Defined in: [types/providers.ts:1742](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1742)

Batch inference job configuration

## Properties

### inputS3Uri

> **inputS3Uri**: `string`

Defined in: [types/providers.ts:1744](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1744)

Input S3 location

---

### outputS3Uri

> **outputS3Uri**: `string`

Defined in: [types/providers.ts:1746](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1746)

Output S3 location

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1748](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1748)

SageMaker model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1750](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1750)

Instance type for batch job

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1752](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1752)

Instance count for batch job

---

### maxPayloadInMB?

> `optional` **maxPayloadInMB?**: `number`

Defined in: [types/providers.ts:1754](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1754)

Maximum payload size in MB

---

### batchStrategy?

> `optional` **batchStrategy?**: `"MultiRecord"` \| `"SingleRecord"`

Defined in: [types/providers.ts:1756](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1756)

Batch strategy
