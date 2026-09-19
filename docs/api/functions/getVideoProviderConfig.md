[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / getVideoProviderConfig

# Function: getVideoProviderConfig()

> **getVideoProviderConfig**(`provider`): [`VideoProviderConfig`](../type-aliases/VideoProviderConfig.md) \| `null`

Defined in: adapters/videoFormatSupport.ts:225

The video-handling row for `provider`, or null when there is none.

Null means "not described here", which is not the same as "takes frames":
an unrecognised provider still receives keyframes, because that is the
pipeline's default, but nothing in this table asserts it will understand
them. Callers wanting the safe reading should treat null as no native
video, which is what [supportsNativeVideo](supportsNativeVideo.md) does.

## Parameters

### provider

`string`

## Returns

[`VideoProviderConfig`](../type-aliases/VideoProviderConfig.md) \| `null`
