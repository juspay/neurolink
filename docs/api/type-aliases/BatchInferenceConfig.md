[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchInferenceConfig

# Type Alias: BatchInferenceConfig

> **BatchInferenceConfig** = `object`

Defined in: [types/providers.ts:1798](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1798)

Batch inference job configuration

## Properties

### inputS3Uri

> **inputS3Uri**: `string`

Defined in: [types/providers.ts:1800](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1800)

Input S3 location

---

### outputS3Uri

> **outputS3Uri**: `string`

Defined in: [types/providers.ts:1802](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1802)

Output S3 location

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1804](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1804)

SageMaker model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1806](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1806)

Instance type for batch job

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1808](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1808)

Instance count for batch job

---

### maxPayloadInMB?

> `optional` **maxPayloadInMB?**: `number`

Defined in: [types/providers.ts:1810](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1810)

Maximum payload size in MB

---

### batchStrategy?

> `optional` **batchStrategy?**: `"MultiRecord"` \| `"SingleRecord"`

Defined in: [types/providers.ts:1812](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1812)

Batch strategy
