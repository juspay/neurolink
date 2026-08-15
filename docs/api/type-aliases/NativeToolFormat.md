[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeToolFormat

# Type Alias: NativeToolFormat

> **NativeToolFormat** = `"input_schema"` \| `"functionDeclarations"`

Defined in: [types/nativeTools.ts:7](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/nativeTools.ts#L7)

Wire formats accepted by `toNativeToolDeclarations` (src/lib/core/nativeToolFormat.ts).
`"input_schema"` is Anthropic's native Messages-API tool shape;
`"functionDeclarations"` is the @google/genai SDK shape shared by the
Gemini-family native providers (Google AI Studio, Vertex+Gemini).
