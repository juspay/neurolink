[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexResponseCustomToolCallItem

# Type Alias: CodexResponseCustomToolCallItem

> **CodexResponseCustomToolCallItem** = `object`

A synthesized call to a tool the request declared `custom` (grammar-
constrained), in the item shape the real backend emits for one — the shape
`codexUsage.ts` reads on the native route and a Codex CLI replays in its
history. `input` is the bare grammar text, never JSON.

## Properties

### id

> **id**: `string`

---

### type

> **type**: `"custom_tool_call"`

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

### input

> **input**: `string`

Empty when status is "incomplete" and the wrapped input never parsed.
