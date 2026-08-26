[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchInferenceConfig

# Type Alias: BatchInferenceConfig

> **BatchInferenceConfig** = `object`

Defined in: [types/providers.ts:1724](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1724)

Batch inference job configuration

## Properties

### inputS3Uri

> **inputS3Uri**: `string`

Defined in: [types/providers.ts:1726](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1726)

Input S3 location

---

### outputS3Uri

> **outputS3Uri**: `string`

Defined in: [types/providers.ts:1728](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1728)

Output S3 location

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1730](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1730)

SageMaker model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1732](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1732)

Instance type for batch job

---

### instanceCount

> **instanceCount**: `number`

Defined in: [types/providers.ts:1734](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1734)

Instance count for batch job

---

### maxPayloadInMB?

> `optional` **maxPayloadInMB?**: `number`

Defined in: [types/providers.ts:1736](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1736)

Maximum payload size in MB

---

### batchStrategy?

> `optional` **batchStrategy?**: `"MultiRecord"` \| `"SingleRecord"`

Defined in: [types/providers.ts:1738](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1738)

Batch strategy
