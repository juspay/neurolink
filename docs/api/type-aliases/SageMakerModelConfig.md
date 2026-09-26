[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerModelConfig

# Type Alias: SageMakerModelConfig

> **SageMakerModelConfig** = `object`

Defined in: [types/providers.ts:1466](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1466)

Model-specific configuration for SageMaker endpoints

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1468](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1468)

SageMaker endpoint name

---

### modelType?

> `optional` **modelType?**: `"llama"` \| `"mistral"` \| `"claude"` \| `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1470](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1470)

Model type for request/response formatting

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/providers.ts:1478](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1478)

Content type for requests

---

### accept?

> `optional` **accept?**: `string`

Defined in: [types/providers.ts:1480](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1480)

Accept header for responses

---

### customAttributes?

> `optional` **customAttributes?**: `string`

Defined in: [types/providers.ts:1482](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1482)

Custom attributes for the endpoint

---

### inputFormat?

> `optional` **inputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1484](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1484)

Input format specification

---

### outputFormat?

> `optional` **outputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1486](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1486)

Output format specification

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1488](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1488)

Maximum tokens for generation

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1490](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1490)

Temperature parameter

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1492](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1492)

Top-p parameter

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1494](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1494)

Stop sequences

---

### initialConcurrency?

> `optional` **initialConcurrency?**: `number`

Defined in: [types/providers.ts:1496](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1496)

Initial concurrency for batch processing

---

### maxConcurrency?

> `optional` **maxConcurrency?**: `number`

Defined in: [types/providers.ts:1498](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1498)

Maximum concurrency for batch processing

---

### minConcurrency?

> `optional` **minConcurrency?**: `number`

Defined in: [types/providers.ts:1500](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1500)

Minimum concurrency for batch processing

---

### maxConcurrentDetectionTests?

> `optional` **maxConcurrentDetectionTests?**: `number`

Defined in: [types/providers.ts:1502](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1502)

Maximum concurrent detection tests
