[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / detectImageMimeType

# Function: detectImageMimeType()

> **detectImageMimeType**(`buffer`): `string`

Defined in: [utils/imageDetection.ts:89](https://github.com/juspay/neurolink/blob/release/src/lib/utils/imageDetection.ts#L89)

Detect an image's MIME type from its magic bytes. Returns `image/png` for
buffers that match no known signature (the safest neutral default for the
Vertex image path).

## Parameters

### buffer

`Buffer`

## Returns

`string`
