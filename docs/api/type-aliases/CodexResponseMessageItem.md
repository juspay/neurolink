[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexResponseMessageItem

# Type Alias: CodexResponseMessageItem

> **CodexResponseMessageItem** = `object`

A synthesized assistant-text item in a Codex `response.output[]` array.

## Properties

### id

> **id**: `string`

---

### type

> **type**: `"message"`

---

### role

> **role**: `"assistant"`

---

### status

> **status**: [`CodexResponseItemStatus`](CodexResponseItemStatus.md)

---

### content

> **content**: [`CodexResponseOutputTextPart`](CodexResponseOutputTextPart.md)[]
