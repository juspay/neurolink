[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexNativePart

# Type Alias: VertexNativePart

> **VertexNativePart** = \{ `text`: `string`; \} \| \{ `inlineData`: \{ `mimeType`: `string`; `data`: `string`; \}; \}

Defined in: [types/providers.ts:2300](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/providers.ts#L2300)

Single part inside a Google Vertex "native" (non-AI-SDK) generateContent
payload — either inline text or an inline base64 data blob.

Despite the "Vertex" prefix, the shape is identical for the Google AI
Studio native path (`@google/genai` SDK), so AI Studio re-uses this type.
