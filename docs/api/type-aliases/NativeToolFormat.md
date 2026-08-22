[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeToolFormat

# Type Alias: NativeToolFormat

> **NativeToolFormat** = `"input_schema"` \| `"functionDeclarations"`

Defined in: [types/nativeTools.ts:7](https://github.com/juspay/neurolink/blob/release/src/lib/types/nativeTools.ts#L7)

Wire formats accepted by `toNativeToolDeclarations` (src/lib/core/nativeToolFormat.ts).
`"input_schema"` is Anthropic's native Messages-API tool shape;
`"functionDeclarations"` is the @google/genai SDK shape shared by the
Gemini-family native providers (Google AI Studio, Vertex+Gemini).
