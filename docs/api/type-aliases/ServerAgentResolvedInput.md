[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAgentResolvedInput

# Type Alias: ServerAgentResolvedInput

> **ServerAgentResolvedInput** = `object`

An agent request's `input` once every attachment has been vetted: URLs and
allowed local paths are replaced by the bytes the server read itself, `data:`
URIs pass through untouched.

## Properties

### text

> **text**: `string`

---

### images?

> `optional` **images?**: (`Buffer` \| `string`)[]

---

### files?

> `optional` **files?**: (`Buffer` \| `string`)[]
