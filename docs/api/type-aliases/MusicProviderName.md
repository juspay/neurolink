[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MusicProviderName

# Type Alias: MusicProviderName

> **MusicProviderName** = `"beatoven"` \| `"elevenlabs-music"` \| `"elevenlabs-sound"` \| `"lyria"` \| `"replicate"` \| `"musicgen"` \| `string` & `object`

Defined in: [types/music.ts:40](https://github.com/juspay/neurolink/blob/release/src/lib/types/music.ts#L40)

Known music provider identifiers shipped with NeuroLink.

`(string & {})` keeps the union open for custom provider names
registered via `MusicProcessor.registerHandler()`.
