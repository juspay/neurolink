[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerTranscribeStreamConfig

# Type Alias: ServerTranscribeStreamConfig

> **ServerTranscribeStreamConfig** = `Omit`\<[`ServerTranscribeRequest`](ServerTranscribeRequest.md), `"audio"` \| `"audioUrl"` \| `"audioPath"` \| `"format"`\> & `object`

The transcribe WebSocket's first text frame: the JSON route's fields without the audio.

## Type Declaration

### streaming?

> `optional` **streaming?**: [`STTStreamingOptions`](STTStreamingOptions.md)
