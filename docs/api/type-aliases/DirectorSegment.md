[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DirectorSegment

# Type Alias: DirectorSegment

> **DirectorSegment** = `object`

Defined in: [types/multimodal.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L245)

A single segment in Director Mode, representing one video clip.

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/multimodal.ts:247](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L247)

Prompt describing the video content for this segment

---

### image

> **image**: `Buffer` \| `string` \| [`ImageWithAltText`](ImageWithAltText.md)

Defined in: [types/multimodal.ts:249](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L249)

Input image for this segment (Buffer, URL string, file path, or ImageWithAltText)
