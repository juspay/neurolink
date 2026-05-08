[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseContext

# Type Alias: LangfuseContext

> **LangfuseContext** = `object`

Defined in: [types/observability.ts:278](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L278)

Extended context for Langfuse spans.
Supports all Langfuse trace attributes for rich observability.

## Properties

### userId?

> `optional` **userId?**: `string` \| `null`

Defined in: [types/observability.ts:279](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L279)

---

### sessionId?

> `optional` **sessionId?**: `string` \| `null`

Defined in: [types/observability.ts:280](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L280)

---

### conversationId?

> `optional` **conversationId?**: `string` \| `null`

Defined in: [types/observability.ts:282](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L282)

Conversation/thread identifier for grouping related traces

---

### requestId?

> `optional` **requestId?**: `string` \| `null`

Defined in: [types/observability.ts:284](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L284)

Request identifier for correlating with application logs

---

### traceName?

> `optional` **traceName?**: `string` \| `null`

Defined in: [types/observability.ts:286](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L286)

Custom trace name for better organization in Langfuse UI

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\> \| `null`

Defined in: [types/observability.ts:288](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L288)

Custom metadata to attach to spans

---

### operationName?

> `optional` **operationName?**: `string` \| `null`

Defined in: [types/observability.ts:293](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L293)

Explicit operation name (e.g., "ai.streamText", "chat", "embeddings").
If set, overrides auto-detection from the span name.

---

### autoDetectOperationName?

> `optional` **autoDetectOperationName?**: `boolean`

Defined in: [types/observability.ts:298](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L298)

Override global autoDetectOperationName setting for this context.
When undefined, uses the global setting (defaults to true).

---

### customAttributes?

> `optional` **customAttributes?**: `Record`\<`string`, `string` \| `number` \| `boolean`\>

Defined in: [types/observability.ts:304](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L304)

Custom attributes to set on all spans within this context.
These attributes are propagated to every span created within the
AsyncLocalStorage context.
