[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoGenerateOptions

# Type Alias: VideoGenerateOptions

> **VideoGenerateOptions** = [`VideoOutputOptions`](VideoOutputOptions.md) & `object`

Defined in: [types/video.ts:34](https://github.com/juspay/neurolink/blob/release/src/lib/types/video.ts#L34)

Bag-form input to `VideoProcessor.generate()` — the primary data (image,
prompt, region) alongside the video-specific output options, collapsed
into a single object matching Music/Avatar's existing `generate(provider,
options)` shape. `VideoHandler.generate()`'s own 4-positional-argument
signature is unchanged; `VideoProcessor.generate()` translates between the
two internally.

## Type Declaration

### image

> **image**: `Buffer`

### prompt

> **prompt**: `string`

### region?

> `optional` **region?**: `string`
