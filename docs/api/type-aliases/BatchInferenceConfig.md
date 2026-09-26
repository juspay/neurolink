[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchInferenceConfig

# Type Alias: BatchInferenceConfig

> **BatchInferenceConfig** = `object`

Defined in: [types/providers.ts:1825](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1825)

Batch inference job configuration

## Properties

### inputS3Uri

> **inputS3Uri**: `string`

Defined in: [types/providers.ts:1827](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1827)

Input S3 location

---

### outputS3Uri

> **outputS3Uri**: `string`

Defined in: [types/providers.ts:1829](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1829)

Output S3 location

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1831](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1831)

SageMaker model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1833](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1833)

Instance type for batch job

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1835](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1835)

Instance count for batch job

---

### maxPayloadInMB?

> `optional` **maxPayloadInMB?**: `number`

Defined in: [types/providers.ts:1837](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1837)

Maximum payload size in MB

---

### batchStrategy?

> `optional` **batchStrategy?**: `"MultiRecord"` \| `"SingleRecord"`

Defined in: [types/providers.ts:1839](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1839)

Batch strategy
