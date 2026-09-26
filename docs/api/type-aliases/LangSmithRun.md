[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangSmithRun

# Type Alias: LangSmithRun

> **LangSmithRun** = `object`

LangSmith-specific run format

## Properties

### id

> **id**: `string`

---

### trace_id

> **trace_id**: `string`

---

### parent_run_id?

> `optional` **parent_run_id?**: `string`

---

### name

> **name**: `string`

---

### run_type

> **run_type**: `"llm"` \| `"chain"` \| `"tool"` \| `"retriever"` \| `"embedding"`

---

### start_time

> **start_time**: `string`

---

### end_time?

> `optional` **end_time?**: `string`

---

### extra

> **extra**: `Record`\<`string`, `unknown`\>

---

### error?

> `optional` **error?**: `string`

---

### inputs?

> `optional` **inputs?**: `unknown`

---

### outputs?

> `optional` **outputs?**: `unknown`

---

### tags?

> `optional` **tags?**: `string`[]
