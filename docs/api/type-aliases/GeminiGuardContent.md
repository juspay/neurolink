[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiGuardContent

# Type Alias: GeminiGuardContent

> **GeminiGuardContent** = `object`

Defined in: [types/context.ts:931](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L931)

Structural view of one Gemini history entry, loose enough to accept both the
native Vertex loop's `{ role, parts }` array and `@google/genai` contents
without a cast at either call site.

## Properties

### role

> **role**: `string`

Defined in: [types/context.ts:932](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L932)

---

### parts

> **parts**: `unknown`[]

Defined in: [types/context.ts:933](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L933)
