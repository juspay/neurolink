[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexNativePart

# Type Alias: VertexNativePart

> **VertexNativePart** = \{ `text`: `string`; \} \| \{ `inlineData`: \{ `mimeType`: `string`; `data`: `string`; \}; \}

Defined in: [types/providers.ts:1958](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L1958)

Single part inside a Google Vertex "native" (non-AI-SDK) generateContent
payload — either inline text or an inline base64 data blob.
