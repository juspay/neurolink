[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiMultimodalInput

# Type Alias: GeminiMultimodalInput

> **GeminiMultimodalInput** = `object`

Defined in: [types/providers.ts:2381](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2381)

Subset of `GenerateOptions["input"]` consumed by the shared Gemini-native
multimodal-parts builder. Kept narrow so the helper doesn't depend on the
full `GenerateOptions` shape. The `images` field mirrors the public
`GenerateOptions["input"].images` shape so the helper accepts the same
value SDK callers pass in (plain Buffer/string or `ImageWithAltText`).

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:2382](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2382)

---

### pdfFiles?

> `optional` **pdfFiles?**: (`Buffer` \| `string`)[]

Defined in: [types/providers.ts:2383](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2383)

---

### images?

> `optional` **images?**: (`Buffer` \| `string` \| \{ `data`: `Buffer` \| `string`; `altText?`: `string`; \})[]

Defined in: [types/providers.ts:2384](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2384)

---

### nativeAudioFiles?

> `optional` **nativeAudioFiles?**: [`MultimodalAudioEntry`](MultimodalAudioEntry.md)[]

Defined in: [types/providers.ts:2390](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2390)

Audio collected during file detection, carried through to the native
request as `inlineData`. Distinct from the user-facing `audioFiles`: these
are already-materialised bytes with a resolved mime type.
