[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeToolFormat

# Type Alias: NativeToolFormat

> **NativeToolFormat** = `"input_schema"` \| `"functionDeclarations"`

Defined in: [types/nativeTools.ts:7](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/nativeTools.ts#L7)

Wire formats accepted by `toNativeToolDeclarations` (src/lib/core/nativeToolFormat.ts).
`"input_schema"` is Anthropic's native Messages-API tool shape;
`"functionDeclarations"` is the @google/genai SDK shape shared by the
Gemini-family native providers (Google AI Studio, Vertex+Gemini).
