[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexNativeReasoningInputItem

# Type Alias: CodexNativeReasoningInputItem

> **CodexNativeReasoningInputItem** = `object`

A reasoning item the client echoes back with `store:false`. Its content is
opaque (`encrypted_content` is readable only by the OpenAI backend), so its
shape is deliberately loose beyond the discriminator.

## Properties

### type

> **type**: `"reasoning"`

---

### id?

> `optional` **id?**: `string`

---

### encrypted_content?

> `optional` **encrypted_content?**: `string` \| `null`

---

### summary?

> `optional` **summary?**: `unknown`[]
