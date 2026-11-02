[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Zod4OverrideContext

# Type Alias: Zod4OverrideContext

> **Zod4OverrideContext** = `object`

What Zod 4's `override` hook is handed for each node it converts: the
schema node, and the JSON Schema it produced for it, which the hook edits
in place.

## Properties

### zodSchema

> **zodSchema**: `ZodCore.$ZodType`

---

### jsonSchema

> **jsonSchema**: `Record`\<`string`, `unknown`\>
