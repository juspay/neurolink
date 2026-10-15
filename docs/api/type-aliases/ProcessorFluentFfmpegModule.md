[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorFluentFfmpegModule

# Type Alias: ProcessorFluentFfmpegModule

> **ProcessorFluentFfmpegModule** = (...`args`) => `unknown` & `object`

Structural shape of the `fluent-ffmpeg` export: a callable carrying the
`ffprobe` and `setFfmpegPath` statics. Public declarations use this instead of
`typeof import("fluent-ffmpeg")`, whose types live in a devDependency that
consumers do not install.

## Type Declaration

### ffprobe

> **ffprobe**: (...`args`) => `unknown`

#### Parameters

##### args

...`never`[]

#### Returns

`unknown`

### setFfmpegPath

> **setFfmpegPath**: (...`args`) => `unknown`

#### Parameters

##### args

...`never`[]

#### Returns

`unknown`
