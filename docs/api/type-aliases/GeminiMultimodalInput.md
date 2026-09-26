[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiMultimodalInput

# Type Alias: GeminiMultimodalInput

> **GeminiMultimodalInput** = `object`

Defined in: [types/providers.ts:2507](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2507)

Subset of `GenerateOptions["input"]` consumed by the shared Gemini-native
multimodal-parts builder. Kept narrow so the helper doesn't depend on the
full `GenerateOptions` shape. The `images` field mirrors the public
`GenerateOptions["input"].images` shape so the helper accepts the same
value SDK callers pass in (plain Buffer/string or `ImageWithAltText`).

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:2508](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2508)

---

### pdfFiles?

> `optional` **pdfFiles?**: (`Buffer` \| `string`)[]

Defined in: [types/providers.ts:2509](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2509)

---

### images?

> `optional` **images?**: (`Buffer` \| `string` \| \{ `data`: `Buffer` \| `string`; `altText?`: `string`; \})[]

Defined in: [types/providers.ts:2510](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2510)

---

### nativeAudioFiles?

> `optional` **nativeAudioFiles?**: [`MultimodalAudioEntry`](MultimodalAudioEntry.md)[]

Defined in: [types/providers.ts:2516](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2516)

Audio collected during file detection, carried through to the native
request as `inlineData`. Distinct from the user-facing `audioFiles`: these
are already-materialised bytes with a resolved mime type.

---

### nativeVideoFiles?

> `optional` **nativeVideoFiles?**: [`MultimodalVideoEntry`](MultimodalVideoEntry.md)[]

Defined in: [types/providers.ts:2523](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2523)

Video collected during file detection, carried through to the native
request as `inlineData`. Distinct from the user-facing `videoFiles`: these
are already-materialised bytes with a resolved mime type and, where it
could be measured, the clip's duration.
