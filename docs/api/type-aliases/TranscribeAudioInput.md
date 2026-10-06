[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TranscribeAudioInput

# Type Alias: TranscribeAudioInput

> **TranscribeAudioInput** = `Buffer` \| `ArrayBuffer` \| `Uint8Array` \| `string` \| `AsyncIterable`\<`Buffer` \| `Uint8Array`\>

Audio for `transcribe()`: bytes, a path or `file://` / `http(s)://` URL, or
an async stream of PCM16LE frames (see `STTStreamingOptions.sampleRate`).
