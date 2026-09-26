[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / getVideoProviderConfig

# Function: getVideoProviderConfig()

> **getVideoProviderConfig**(`provider`, `model?`): [`VideoProviderConfig`](../type-aliases/VideoProviderConfig.md) \| `null`

The video-handling row for `provider`, or null when there is none.

Null means "not described here", which is not the same as "takes frames":
an unrecognised provider still receives keyframes, because that is the
pipeline's default, but nothing in this table asserts it will understand
them. Callers wanting the safe reading should treat null as no native
video, which is what [supportsNativeVideo](supportsNativeVideo.md) does.

`model` disambiguates Vertex: `GoogleVertexProvider` sends any model whose
id contains "claude" to the native Anthropic SDK, which never sees the
video part at all, so a Claude-on-Vertex request gets the frame-extraction
row (the same one plain `"anthropic"` gets) rather than the Gemini row the
provider name alone would suggest. Omitting `model` keeps the previous,
provider-only lookup, which is still correct for every non-Vertex caller —
AI Studio and the bare `"gemini"` alias never host Claude models.

## Parameters

### provider

`string`

### model?

`string`

## Returns

[`VideoProviderConfig`](../type-aliases/VideoProviderConfig.md) \| `null`
