[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / DirectorSegment

# Type Alias: DirectorSegment

> **DirectorSegment** = `object`

Defined in: [types/multimodal.ts:181](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L181)

A single segment in Director Mode, representing one video clip.

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/multimodal.ts:183](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L183)

Prompt describing the video content for this segment

---

### image

> **image**: `Buffer` \| `string` \| [`ImageWithAltText`](ImageWithAltText.md)

Defined in: [types/multimodal.ts:185](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L185)

Input image for this segment (Buffer, URL string, file path, or ImageWithAltText)
