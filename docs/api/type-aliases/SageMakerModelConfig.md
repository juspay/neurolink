[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerModelConfig

# Type Alias: SageMakerModelConfig

> **SageMakerModelConfig** = `object`

Defined in: [types/providers.ts:1485](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1485)

Model-specific configuration for SageMaker endpoints

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1487](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1487)

SageMaker endpoint name

---

### modelType?

> `optional` **modelType?**: `"llama"` \| `"mistral"` \| `"claude"` \| `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1489](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1489)

Model type for request/response formatting

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/providers.ts:1497](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1497)

Content type for requests

---

### accept?

> `optional` **accept?**: `string`

Defined in: [types/providers.ts:1499](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1499)

Accept header for responses

---

### customAttributes?

> `optional` **customAttributes?**: `string`

Defined in: [types/providers.ts:1501](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1501)

Custom attributes for the endpoint

---

### inputFormat?

> `optional` **inputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1503](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1503)

Input format specification

---

### outputFormat?

> `optional` **outputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1505](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1505)

Output format specification

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1507](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1507)

Maximum tokens for generation

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1509](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1509)

Temperature parameter

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1511](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1511)

Top-p parameter

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1513](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1513)

Stop sequences

---

### initialConcurrency?

> `optional` **initialConcurrency?**: `number`

Defined in: [types/providers.ts:1515](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1515)

Initial concurrency for batch processing

---

### maxConcurrency?

> `optional` **maxConcurrency?**: `number`

Defined in: [types/providers.ts:1517](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1517)

Maximum concurrency for batch processing

---

### minConcurrency?

> `optional` **minConcurrency?**: `number`

Defined in: [types/providers.ts:1519](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1519)

Minimum concurrency for batch processing

---

### maxConcurrentDetectionTests?

> `optional` **maxConcurrentDetectionTests?**: `number`

Defined in: [types/providers.ts:1521](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1521)

Maximum concurrent detection tests
