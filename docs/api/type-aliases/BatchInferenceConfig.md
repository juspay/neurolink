[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchInferenceConfig

# Type Alias: BatchInferenceConfig

> **BatchInferenceConfig** = `object`

Defined in: [types/providers.ts:1818](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1818)

Batch inference job configuration

## Properties

### inputS3Uri

> **inputS3Uri**: `string`

Defined in: [types/providers.ts:1820](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1820)

Input S3 location

---

### outputS3Uri

> **outputS3Uri**: `string`

Defined in: [types/providers.ts:1822](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1822)

Output S3 location

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1824](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1824)

SageMaker model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1826](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1826)

Instance type for batch job

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1828](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1828)

Instance count for batch job

---

### maxPayloadInMB?

> `optional` **maxPayloadInMB?**: `number`

Defined in: [types/providers.ts:1830](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1830)

Maximum payload size in MB

---

### batchStrategy?

> `optional` **batchStrategy?**: `"MultiRecord"` \| `"SingleRecord"`

Defined in: [types/providers.ts:1832](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1832)

Batch strategy
