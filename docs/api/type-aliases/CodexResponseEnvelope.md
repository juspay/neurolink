[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexResponseEnvelope

# Type Alias: CodexResponseEnvelope

> **CodexResponseEnvelope** = `object`

A complete Codex Responses envelope — the non-streaming body, and the shape
carried inside a terminal `response.*` SSE event's `response` field.

## Properties

### id

> **id**: `string`

---

### object

> **object**: `"response"`

---

### created_at

> **created_at**: `number`

---

### status

> **status**: `"completed"` \| `"incomplete"` \| `"failed"`

---

### model

> **model**: `string`

---

### output

> **output**: [`CodexResponseItem`](CodexResponseItem.md)[]

---

### usage?

> `optional` **usage?**: [`CodexResponseUsage`](CodexResponseUsage.md)

---

### incomplete_details

> **incomplete_details**: \{ `reason`: `"max_output_tokens"`; \} \| `null`

---

### error

> **error**: \{ `code`: `string`; `message`: `string`; \} \| `null`
