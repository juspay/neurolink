[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerModelConfig

# Type Alias: SageMakerModelConfig

> **SageMakerModelConfig** = `object`

Defined in: [types/providers.ts:1478](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1478)

Model-specific configuration for SageMaker endpoints

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1480](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1480)

SageMaker endpoint name

---

### modelType?

> `optional` **modelType?**: `"llama"` \| `"mistral"` \| `"claude"` \| `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1482](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1482)

Model type for request/response formatting

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/providers.ts:1490](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1490)

Content type for requests

---

### accept?

> `optional` **accept?**: `string`

Defined in: [types/providers.ts:1492](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1492)

Accept header for responses

---

### customAttributes?

> `optional` **customAttributes?**: `string`

Defined in: [types/providers.ts:1494](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1494)

Custom attributes for the endpoint

---

### inputFormat?

> `optional` **inputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1496](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1496)

Input format specification

---

### outputFormat?

> `optional` **outputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1498](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1498)

Output format specification

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1500](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1500)

Maximum tokens for generation

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1502](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1502)

Temperature parameter

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1504](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1504)

Top-p parameter

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1506](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1506)

Stop sequences

---

### initialConcurrency?

> `optional` **initialConcurrency?**: `number`

Defined in: [types/providers.ts:1508](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1508)

Initial concurrency for batch processing

---

### maxConcurrency?

> `optional` **maxConcurrency?**: `number`

Defined in: [types/providers.ts:1510](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1510)

Maximum concurrency for batch processing

---

### minConcurrency?

> `optional` **minConcurrency?**: `number`

Defined in: [types/providers.ts:1512](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1512)

Minimum concurrency for batch processing

---

### maxConcurrentDetectionTests?

> `optional` **maxConcurrentDetectionTests?**: `number`

Defined in: [types/providers.ts:1514](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1514)

Maximum concurrent detection tests
