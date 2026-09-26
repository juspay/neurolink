[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingCapability

# Type Alias: StreamingCapability

> **StreamingCapability** = `object`

Streaming capability information for an endpoint

## Properties

### supported

> **supported**: `boolean`

Whether streaming is supported

---

### protocol

> **protocol**: `"sse"` \| `"jsonl"` \| `"chunked"` \| `"none"`

Detected streaming protocol

---

### modelType

> **modelType**: `"huggingface"` \| `"llama"` \| `"pytorch"` \| `"tensorflow"` \| `"custom"`

Detected model framework

---

### testEndpoint?

> `optional` **testEndpoint?**: `string`

Test endpoint for streaming validation

---

### parameters?

> `optional` **parameters?**: `Record`\<`string`, `unknown`\>

Required parameters for streaming

---

### confidence

> **confidence**: `number`

Confidence level of detection (0-1)

---

### metadata?

> `optional` **metadata?**: `object`

Additional metadata about the model

#### modelName?

> `optional` **modelName?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### version?

> `optional` **version?**: `string`

#### tags?

> `optional` **tags?**: `string`[]
