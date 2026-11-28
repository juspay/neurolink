[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderWireUsage

# Type Alias: ProviderWireUsage

> **ProviderWireUsage** = `object`

Dotted paths to one wire's token counts. `cacheRead` is reported INSIDE
`input`; whether `reasoning` is inside `output` differs by wire.

## Properties

### input

> **input**: `string`

---

### output

> **output**: `string`

---

### total?

> `optional` **total?**: `string`

---

### cacheRead?

> `optional` **cacheRead?**: `string`

---

### reasoning?

> `optional` **reasoning?**: `string`

---

### reasoningInOutput

> **reasoningInOutput**: `boolean`

True when `output` already counts the reasoning tokens (OpenAI); false when they come on top (Gemini).
