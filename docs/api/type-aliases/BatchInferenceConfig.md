[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchInferenceConfig

# Type Alias: BatchInferenceConfig

> **BatchInferenceConfig** = `object`

Batch inference job configuration

## Properties

### inputS3Uri

> **inputS3Uri**: `string`

Input S3 location

---

### outputS3Uri

> **outputS3Uri**: `string`

Output S3 location

---

### modelName

> **modelName**: `string`

SageMaker model name

---

### instanceType

> **instanceType**: `string`

Instance type for batch job

---

### instanceCount

> **instanceCount**: `number`

Instance count for batch job

---

### maxPayloadInMB?

> `optional` **maxPayloadInMB?**: `number`

Maximum payload size in MB

---

### batchStrategy?

> `optional` **batchStrategy?**: `"MultiRecord"` \| `"SingleRecord"`

Batch strategy
