[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerModelConfig

# Type Alias: SageMakerModelConfig

> **SageMakerModelConfig** = `object`

Defined in: [types/providers.ts:1394](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1394)

Model-specific configuration for SageMaker endpoints

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1396](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1396)

SageMaker endpoint name

---

### modelType?

> `optional` **modelType?**: `"llama"` \| `"mistral"` \| `"claude"` \| `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1398](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1398)

Model type for request/response formatting

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/providers.ts:1406](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1406)

Content type for requests

---

### accept?

> `optional` **accept?**: `string`

Defined in: [types/providers.ts:1408](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1408)

Accept header for responses

---

### customAttributes?

> `optional` **customAttributes?**: `string`

Defined in: [types/providers.ts:1410](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1410)

Custom attributes for the endpoint

---

### inputFormat?

> `optional` **inputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1412](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1412)

Input format specification

---

### outputFormat?

> `optional` **outputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1414](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1414)

Output format specification

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1416](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1416)

Maximum tokens for generation

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1418](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1418)

Temperature parameter

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1420](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1420)

Top-p parameter

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1422](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1422)

Stop sequences

---

### initialConcurrency?

> `optional` **initialConcurrency?**: `number`

Defined in: [types/providers.ts:1424](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1424)

Initial concurrency for batch processing

---

### maxConcurrency?

> `optional` **maxConcurrency?**: `number`

Defined in: [types/providers.ts:1426](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1426)

Maximum concurrency for batch processing

---

### minConcurrency?

> `optional` **minConcurrency?**: `number`

Defined in: [types/providers.ts:1428](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1428)

Minimum concurrency for batch processing

---

### maxConcurrentDetectionTests?

> `optional` **maxConcurrentDetectionTests?**: `number`

Defined in: [types/providers.ts:1430](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1430)

Maximum concurrent detection tests
