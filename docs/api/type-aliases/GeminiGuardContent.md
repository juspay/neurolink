[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiGuardContent

# Type Alias: GeminiGuardContent

> **GeminiGuardContent** = `object`

Defined in: [types/context.ts:940](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L940)

Structural view of one Gemini history entry, loose enough to accept both the
native Vertex loop's `{ role, parts }` array and `@google/genai` contents
without a cast at either call site.

## Properties

### role

> **role**: `string`

Defined in: [types/context.ts:941](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L941)

---

### parts

> **parts**: `unknown`[]

Defined in: [types/context.ts:942](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L942)
