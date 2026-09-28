[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexResponseFunctionCallItem

# Type Alias: CodexResponseFunctionCallItem

> **CodexResponseFunctionCallItem** = `object`

A synthesized tool-call item in a Codex `response.output[]` array.

## Properties

### id

> **id**: `string`

---

### type

> **type**: `"function_call"`

---

### status

> **status**: [`CodexResponseItemStatus`](CodexResponseItemStatus.md)

---

### call_id

> **call_id**: `string`

---

### name

> **name**: `string`

---

### arguments

> **arguments**: `string`

Concatenation of raw partial_json fragments. Valid JSON when status is
"completed"; may be a truncated, non-JSON fragment when status is
"incomplete" (closed early by a mid-stream failure).
