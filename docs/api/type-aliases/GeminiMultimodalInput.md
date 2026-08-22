[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiMultimodalInput

# Type Alias: GeminiMultimodalInput

> **GeminiMultimodalInput** = `object`

Defined in: [types/providers.ts:2362](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2362)

Subset of `GenerateOptions["input"]` consumed by the shared Gemini-native
multimodal-parts builder. Kept narrow so the helper doesn't depend on the
full `GenerateOptions` shape. The `images` field mirrors the public
`GenerateOptions["input"].images` shape so the helper accepts the same
value SDK callers pass in (plain Buffer/string or `ImageWithAltText`).

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:2363](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2363)

---

### pdfFiles?

> `optional` **pdfFiles?**: (`Buffer` \| `string`)[]

Defined in: [types/providers.ts:2364](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2364)

---

### images?

> `optional` **images?**: (`Buffer` \| `string` \| \{ `data`: `Buffer` \| `string`; `altText?`: `string`; \})[]

Defined in: [types/providers.ts:2365](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2365)

---

### nativeAudioFiles?

> `optional` **nativeAudioFiles?**: [`MultimodalAudioEntry`](MultimodalAudioEntry.md)[]

Defined in: [types/providers.ts:2371](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2371)

Audio collected during file detection, carried through to the native
request as `inlineData`. Distinct from the user-facing `audioFiles`: these
are already-materialised bytes with a resolved mime type.
