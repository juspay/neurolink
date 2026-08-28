[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerModelConfig

# Type Alias: SageMakerModelConfig

> **SageMakerModelConfig** = `object`

Defined in: [types/providers.ts:1397](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1397)

Model-specific configuration for SageMaker endpoints

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1399](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1399)

SageMaker endpoint name

---

### modelType?

> `optional` **modelType?**: `"llama"` \| `"mistral"` \| `"claude"` \| `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1401](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1401)

Model type for request/response formatting

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/providers.ts:1409](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1409)

Content type for requests

---

### accept?

> `optional` **accept?**: `string`

Defined in: [types/providers.ts:1411](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1411)

Accept header for responses

---

### customAttributes?

> `optional` **customAttributes?**: `string`

Defined in: [types/providers.ts:1413](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1413)

Custom attributes for the endpoint

---

### inputFormat?

> `optional` **inputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1415](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1415)

Input format specification

---

### outputFormat?

> `optional` **outputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1417](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1417)

Output format specification

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1419](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1419)

Maximum tokens for generation

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1421](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1421)

Temperature parameter

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1423](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1423)

Top-p parameter

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1425](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1425)

Stop sequences

---

### initialConcurrency?

> `optional` **initialConcurrency?**: `number`

Defined in: [types/providers.ts:1427](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1427)

Initial concurrency for batch processing

---

### maxConcurrency?

> `optional` **maxConcurrency?**: `number`

Defined in: [types/providers.ts:1429](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1429)

Maximum concurrency for batch processing

---

### minConcurrency?

> `optional` **minConcurrency?**: `number`

Defined in: [types/providers.ts:1431](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1431)

Minimum concurrency for batch processing

---

### maxConcurrentDetectionTests?

> `optional` **maxConcurrentDetectionTests?**: `number`

Defined in: [types/providers.ts:1433](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1433)

Maximum concurrent detection tests
