[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerModelConfig

# Type Alias: SageMakerModelConfig

> **SageMakerModelConfig** = `object`

Model-specific configuration for SageMaker endpoints

## Properties

### endpointName

> **endpointName**: `string`

SageMaker endpoint name

---

### modelType?

> `optional` **modelType?**: `"llama"` \| `"mistral"` \| `"claude"` \| `"huggingface"` \| `"jumpstart"` \| `"custom"`

Model type for request/response formatting

---

### contentType?

> `optional` **contentType?**: `string`

Content type for requests

---

### accept?

> `optional` **accept?**: `string`

Accept header for responses

---

### customAttributes?

> `optional` **customAttributes?**: `string`

Custom attributes for the endpoint

---

### inputFormat?

> `optional` **inputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Input format specification

---

### outputFormat?

> `optional` **outputFormat?**: `"huggingface"` \| `"jumpstart"` \| `"custom"`

Output format specification

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Maximum tokens for generation

---

### temperature?

> `optional` **temperature?**: `number`

Temperature parameter

---

### topP?

> `optional` **topP?**: `number`

Top-p parameter

---

### stopSequences?

> `optional` **stopSequences?**: `string`[]

Stop sequences

---

### initialConcurrency?

> `optional` **initialConcurrency?**: `number`

Initial concurrency for batch processing

---

### maxConcurrency?

> `optional` **maxConcurrency?**: `number`

Maximum concurrency for batch processing

---

### minConcurrency?

> `optional` **minConcurrency?**: `number`

Minimum concurrency for batch processing

---

### maxConcurrentDetectionTests?

> `optional` **maxConcurrentDetectionTests?**: `number`

Maximum concurrent detection tests
