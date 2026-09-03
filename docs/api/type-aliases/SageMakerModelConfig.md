[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerModelConfig

# Type Alias: SageMakerModelConfig

> **SageMakerModelConfig** = `object`

Defined in: [types/providers.ts:1405](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1405)

Model-specific configuration for SageMaker endpoints

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1407](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1407)

SageMaker endpoint name

---

### modelType?

> `optional` **modelType?**: `"llama"` \| `"mistral"` \| `"claude"` \| `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1409](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1409)

Model type for request/response formatting

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/providers.ts:1417](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1417)

Content type for requests

---

### accept?

> `optional` **accept?**: `string`

Defined in: [types/providers.ts:1419](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1419)

Accept header for responses

---

### customAttributes?

> `optional` **customAttributes?**: `string`

Defined in: [types/providers.ts:1421](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1421)

Custom attributes for the endpoint

---

### inputFormat?

> `optional` **inputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1423](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1423)

Input format specification

---

### outputFormat?

> `optional` **outputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1425](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1425)

Output format specification

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1427](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1427)

Maximum tokens for generation

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1429](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1429)

Temperature parameter

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1431](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1431)

Top-p parameter

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1433](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1433)

Stop sequences

---

### initialConcurrency?

> `optional` **initialConcurrency?**: `number`

Defined in: [types/providers.ts:1435](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1435)

Initial concurrency for batch processing

---

### maxConcurrency?

> `optional` **maxConcurrency?**: `number`

Defined in: [types/providers.ts:1437](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1437)

Maximum concurrency for batch processing

---

### minConcurrency?

> `optional` **minConcurrency?**: `number`

Defined in: [types/providers.ts:1439](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1439)

Minimum concurrency for batch processing

---

### maxConcurrentDetectionTests?

> `optional` **maxConcurrentDetectionTests?**: `number`

Defined in: [types/providers.ts:1441](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1441)

Maximum concurrent detection tests
