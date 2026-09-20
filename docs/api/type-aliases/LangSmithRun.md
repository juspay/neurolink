[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangSmithRun

# Type Alias: LangSmithRun

> **LangSmithRun** = `object`

Defined in: [types/span.ts:249](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L249)

LangSmith-specific run format

## Properties

### id

> **id**: `string`

Defined in: [types/span.ts:250](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L250)

---

### trace_id

> **trace_id**: `string`

Defined in: [types/span.ts:251](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L251)

---

### parent_run_id?

> `optional` **parent_run_id?**: `string`

Defined in: [types/span.ts:252](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L252)

---

### name

> **name**: `string`

Defined in: [types/span.ts:253](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L253)

---

### run_type

> **run_type**: `"llm"` \| `"chain"` \| `"tool"` \| `"retriever"` \| `"embedding"`

Defined in: [types/span.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L254)

---

### start_time

> **start_time**: `string`

Defined in: [types/span.ts:255](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L255)

---

### end_time?

> `optional` **end_time?**: `string`

Defined in: [types/span.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L256)

---

### extra

> **extra**: `Record`\<`string`, `unknown`\>

Defined in: [types/span.ts:257](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L257)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/span.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L258)

---

### inputs?

> `optional` **inputs?**: `unknown`

Defined in: [types/span.ts:259](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L259)

---

### outputs?

> `optional` **outputs?**: `unknown`

Defined in: [types/span.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L260)

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/span.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L261)
