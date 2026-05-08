[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangSmithRun

# Type Alias: LangSmithRun

> **LangSmithRun** = `object`

Defined in: [types/span.ts:238](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L238)

LangSmith-specific run format

## Properties

### id

> **id**: `string`

Defined in: [types/span.ts:239](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L239)

---

### trace_id

> **trace_id**: `string`

Defined in: [types/span.ts:240](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L240)

---

### parent_run_id?

> `optional` **parent_run_id?**: `string`

Defined in: [types/span.ts:241](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L241)

---

### name

> **name**: `string`

Defined in: [types/span.ts:242](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L242)

---

### run_type

> **run_type**: `"llm"` \| `"chain"` \| `"tool"` \| `"retriever"` \| `"embedding"`

Defined in: [types/span.ts:243](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L243)

---

### start_time

> **start_time**: `string`

Defined in: [types/span.ts:244](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L244)

---

### end_time?

> `optional` **end_time?**: `string`

Defined in: [types/span.ts:245](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L245)

---

### extra

> **extra**: `Record`\<`string`, `unknown`\>

Defined in: [types/span.ts:246](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L246)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/span.ts:247](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L247)

---

### inputs?

> `optional` **inputs?**: `unknown`

Defined in: [types/span.ts:248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L248)

---

### outputs?

> `optional` **outputs?**: `unknown`

Defined in: [types/span.ts:249](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L249)

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/span.ts:250](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L250)
