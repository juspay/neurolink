[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingCapability

# Type Alias: StreamingCapability

> **StreamingCapability** = `object`

Defined in: [types/common.ts:645](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L645)

Streaming capability information for an endpoint

## Properties

### supported

> **supported**: `boolean`

Defined in: [types/common.ts:647](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L647)

Whether streaming is supported

---

### protocol

> **protocol**: `"sse"` \| `"jsonl"` \| `"chunked"` \| `"none"`

Defined in: [types/common.ts:649](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L649)

Detected streaming protocol

---

### modelType

> **modelType**: `"huggingface"` \| `"llama"` \| `"pytorch"` \| `"tensorflow"` \| `"custom"`

Defined in: [types/common.ts:651](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L651)

Detected model framework

---

### testEndpoint?

> `optional` **testEndpoint?**: `string`

Defined in: [types/common.ts:653](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L653)

Test endpoint for streaming validation

---

### parameters?

> `optional` **parameters?**: `Record`\<`string`, `unknown`\>

Defined in: [types/common.ts:655](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L655)

Required parameters for streaming

---

### confidence

> **confidence**: `number`

Defined in: [types/common.ts:657](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L657)

Confidence level of detection (0-1)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/common.ts:659](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L659)

Additional metadata about the model

#### modelName?

> `optional` **modelName?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### version?

> `optional` **version?**: `string`

#### tags?

> `optional` **tags?**: `string`[]
