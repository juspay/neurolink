[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchInferenceConfig

# Type Alias: BatchInferenceConfig

> **BatchInferenceConfig** = `object`

Defined in: [types/providers.ts:1806](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1806)

Batch inference job configuration

## Properties

### inputS3Uri

> **inputS3Uri**: `string`

Defined in: [types/providers.ts:1808](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1808)

Input S3 location

---

### outputS3Uri

> **outputS3Uri**: `string`

Defined in: [types/providers.ts:1810](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1810)

Output S3 location

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1812](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1812)

SageMaker model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1814](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1814)

Instance type for batch job

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1816](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1816)

Instance count for batch job

---

### maxPayloadInMB?

> `optional` **maxPayloadInMB?**: `number`

Defined in: [types/providers.ts:1818](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1818)

Maximum payload size in MB

---

### batchStrategy?

> `optional` **batchStrategy?**: `"MultiRecord"` \| `"SingleRecord"`

Defined in: [types/providers.ts:1820](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1820)

Batch strategy
