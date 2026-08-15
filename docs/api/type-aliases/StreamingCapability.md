[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingCapability

# Type Alias: StreamingCapability

> **StreamingCapability** = `object`

Defined in: [types/common.ts:557](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L557)

Streaming capability information for an endpoint

## Properties

### supported

> **supported**: `boolean`

Defined in: [types/common.ts:559](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L559)

Whether streaming is supported

---

### protocol

> **protocol**: `"sse"` \| `"jsonl"` \| `"chunked"` \| `"none"`

Defined in: [types/common.ts:561](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L561)

Detected streaming protocol

---

### modelType

> **modelType**: `"huggingface"` \| `"llama"` \| `"pytorch"` \| `"tensorflow"` \| `"custom"`

Defined in: [types/common.ts:563](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L563)

Detected model framework

---

### testEndpoint?

> `optional` **testEndpoint?**: `string`

Defined in: [types/common.ts:565](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L565)

Test endpoint for streaming validation

---

### parameters?

> `optional` **parameters?**: `Record`\<`string`, `unknown`\>

Defined in: [types/common.ts:567](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L567)

Required parameters for streaming

---

### confidence

> **confidence**: `number`

Defined in: [types/common.ts:569](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L569)

Confidence level of detection (0-1)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/common.ts:571](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L571)

Additional metadata about the model

#### modelName?

> `optional` **modelName?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### version?

> `optional` **version?**: `string`

#### tags?

> `optional` **tags?**: `string`[]
