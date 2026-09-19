[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VisionImageOutputFormat

# Type Alias: VisionImageOutputFormat

> **VisionImageOutputFormat** = `"png"` \| `"jpeg"`

Defined in: [types/file.ts:36](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L36)

Transcode target for a vision-incompatible image (`adapters/imageFormatSupport.ts`).

Defaults to `"png"` everywhere a caller does not pick one: sources routed
through that module are frequently lossless (TIFF, BMP, ICO) or already
carry alpha, and a lossy re-encode of an image the model is about to read
closely is the wrong default. `"jpeg"` is available for callers who know
their source has no alpha and prefer the smaller payload.
