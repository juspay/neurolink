[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexNativePart

# Type Alias: VertexNativePart

> **VertexNativePart** = \{ `text`: `string`; \} \| \{ `inlineData`: \{ `mimeType`: `string`; `data`: `string`; \}; \}

Defined in: [types/providers.ts:2358](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2358)

Single part inside a Google Vertex "native" (non-AI-SDK) generateContent
payload — either inline text or an inline base64 data blob.

Despite the "Vertex" prefix, the shape is identical for the Google AI
Studio native path (`@google/genai` SDK), so AI Studio re-uses this type.
