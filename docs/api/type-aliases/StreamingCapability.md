[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingCapability

# Type Alias: StreamingCapability

> **StreamingCapability** = `object`

Defined in: [types/common.ts:527](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L527)

Streaming capability information for an endpoint

## Properties

### supported

> **supported**: `boolean`

Defined in: [types/common.ts:529](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L529)

Whether streaming is supported

---

### protocol

> **protocol**: `"sse"` \| `"jsonl"` \| `"chunked"` \| `"none"`

Defined in: [types/common.ts:531](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L531)

Detected streaming protocol

---

### modelType

> **modelType**: `"huggingface"` \| `"llama"` \| `"pytorch"` \| `"tensorflow"` \| `"custom"`

Defined in: [types/common.ts:533](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L533)

Detected model framework

---

### testEndpoint?

> `optional` **testEndpoint?**: `string`

Defined in: [types/common.ts:535](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L535)

Test endpoint for streaming validation

---

### parameters?

> `optional` **parameters?**: `Record`\<`string`, `unknown`\>

Defined in: [types/common.ts:537](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L537)

Required parameters for streaming

---

### confidence

> **confidence**: `number`

Defined in: [types/common.ts:539](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L539)

Confidence level of detection (0-1)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/common.ts:541](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L541)

Additional metadata about the model

#### modelName?

> `optional` **modelName?**: `string`

#### framework?

> `optional` **framework?**: `string`

#### version?

> `optional` **version?**: `string`

#### tags?

> `optional` **tags?**: `string`[]
