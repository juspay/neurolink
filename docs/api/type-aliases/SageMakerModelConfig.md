[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerModelConfig

# Type Alias: SageMakerModelConfig

> **SageMakerModelConfig** = `object`

Defined in: [types/providers.ts:1463](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1463)

Model-specific configuration for SageMaker endpoints

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1465](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1465)

SageMaker endpoint name

---

### modelType?

> `optional` **modelType?**: `"llama"` \| `"mistral"` \| `"claude"` \| `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1467](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1467)

Model type for request/response formatting

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/providers.ts:1475](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1475)

Content type for requests

---

### accept?

> `optional` **accept?**: `string`

Defined in: [types/providers.ts:1477](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1477)

Accept header for responses

---

### customAttributes?

> `optional` **customAttributes?**: `string`

Defined in: [types/providers.ts:1479](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1479)

Custom attributes for the endpoint

---

### inputFormat?

> `optional` **inputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1481](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1481)

Input format specification

---

### outputFormat?

> `optional` **outputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1483](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1483)

Output format specification

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1485](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1485)

Maximum tokens for generation

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1487](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1487)

Temperature parameter

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1489](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1489)

Top-p parameter

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1491](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1491)

Stop sequences

---

### initialConcurrency?

> `optional` **initialConcurrency?**: `number`

Defined in: [types/providers.ts:1493](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1493)

Initial concurrency for batch processing

---

### maxConcurrency?

> `optional` **maxConcurrency?**: `number`

Defined in: [types/providers.ts:1495](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1495)

Maximum concurrency for batch processing

---

### minConcurrency?

> `optional` **minConcurrency?**: `number`

Defined in: [types/providers.ts:1497](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1497)

Minimum concurrency for batch processing

---

### maxConcurrentDetectionTests?

> `optional` **maxConcurrentDetectionTests?**: `number`

Defined in: [types/providers.ts:1499](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1499)

Maximum concurrent detection tests
