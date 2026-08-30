[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiMultimodalInput

# Type Alias: GeminiMultimodalInput

> **GeminiMultimodalInput** = `object`

Defined in: [types/providers.ts:2397](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2397)

Subset of `GenerateOptions["input"]` consumed by the shared Gemini-native
multimodal-parts builder. Kept narrow so the helper doesn't depend on the
full `GenerateOptions` shape. The `images` field mirrors the public
`GenerateOptions["input"].images` shape so the helper accepts the same
value SDK callers pass in (plain Buffer/string or `ImageWithAltText`).

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:2398](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2398)

---

### pdfFiles?

> `optional` **pdfFiles?**: (`Buffer` \| `string`)[]

Defined in: [types/providers.ts:2399](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2399)

---

### images?

> `optional` **images?**: (`Buffer` \| `string` \| \{ `data`: `Buffer` \| `string`; `altText?`: `string`; \})[]

Defined in: [types/providers.ts:2400](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2400)

---

### nativeAudioFiles?

> `optional` **nativeAudioFiles?**: [`MultimodalAudioEntry`](MultimodalAudioEntry.md)[]

Defined in: [types/providers.ts:2406](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2406)

Audio collected during file detection, carried through to the native
request as `inlineData`. Distinct from the user-facing `audioFiles`: these
are already-materialised bytes with a resolved mime type.
