[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MusicProviderName

# Type Alias: MusicProviderName

> **MusicProviderName** = `"beatoven"` \| `"elevenlabs-music"` \| `"elevenlabs-sound"` \| `"lyria"` \| `"replicate"` \| `"musicgen"` \| `string` & `object`

Defined in: [types/music.ts:40](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L40)

Known music provider identifiers shipped with NeuroLink.

`(string & {})` keeps the union open for custom provider names
registered via `MusicProcessor.registerHandler()`.
