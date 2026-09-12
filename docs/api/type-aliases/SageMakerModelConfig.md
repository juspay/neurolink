[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerModelConfig

# Type Alias: SageMakerModelConfig

> **SageMakerModelConfig** = `object`

Defined in: [types/providers.ts:1400](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1400)

Model-specific configuration for SageMaker endpoints

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1402](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1402)

SageMaker endpoint name

---

### modelType?

> `optional` **modelType?**: `"llama"` \| `"mistral"` \| `"claude"` \| `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1404](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1404)

Model type for request/response formatting

---

### contentType?

> `optional` **contentType?**: `string`

Defined in: [types/providers.ts:1412](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1412)

Content type for requests

---

### accept?

> `optional` **accept?**: `string`

Defined in: [types/providers.ts:1414](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1414)

Accept header for responses

---

### customAttributes?

> `optional` **customAttributes?**: `string`

Defined in: [types/providers.ts:1416](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1416)

Custom attributes for the endpoint

---

### inputFormat?

> `optional` **inputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1418](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1418)

Input format specification

---

### outputFormat?

> `optional` **outputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Defined in: [types/providers.ts:1420](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1420)

Output format specification

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:1422](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1422)

Maximum tokens for generation

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/providers.ts:1424](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1424)

Temperature parameter

---

### topP?

> `optional` **topP?**: `number`

Defined in: [types/providers.ts:1426](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1426)

Top-p parameter

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Defined in: [types/providers.ts:1428](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1428)

Stop sequences

---

### initialConcurrency?

> `optional` **initialConcurrency?**: `number`

Defined in: [types/providers.ts:1430](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1430)

Initial concurrency for batch processing

---

### maxConcurrency?

> `optional` **maxConcurrency?**: `number`

Defined in: [types/providers.ts:1432](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1432)

Maximum concurrency for batch processing

---

### minConcurrency?

> `optional` **minConcurrency?**: `number`

Defined in: [types/providers.ts:1434](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1434)

Minimum concurrency for batch processing

---

### maxConcurrentDetectionTests?

> `optional` **maxConcurrentDetectionTests?**: `number`

Defined in: [types/providers.ts:1436](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1436)

Maximum concurrent detection tests
