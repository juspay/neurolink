[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / sniffImageMimeType

# Function: sniffImageMimeType()

> **sniffImageMimeType**(`buffer`): `string` \| `null`

Detect an image's MIME type from its magic bytes, or `null` when the bytes
match no known signature.

Use this when the answer "not an image" has to be distinguishable from a
default. `detectImageMimeType` collapses that distinction on purpose, which
is right for a caller that already knows it holds an image and wrong for one
deciding whether it does.

## Parameters

### buffer

`Buffer`

## Returns

`string` \| `null`
