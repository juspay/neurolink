[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VisionTranscodeOptions

# Type Alias: VisionTranscodeOptions

> **VisionTranscodeOptions** = `object`

Defined in: [types/file.ts:50](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L50)

Knobs for one vision-compatibility pass.

`autoOrient` exists so a caller that also wants EXIF orientation applied
gets it inside the same decode. Rotating first and transcoding second means
two full decode/re-encode cycles, and for the lossy formats in both sets
(TIFF, which sharp writes JPEG-compressed by default) the intermediate
re-encode costs a generation of image quality that the model then reads.

## Properties

### autoOrient?

> `readonly` `optional` **autoOrient?**: `boolean`

Defined in: [types/file.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L51)
