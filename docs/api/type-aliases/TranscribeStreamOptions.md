[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TranscribeStreamOptions

# Type Alias: TranscribeStreamOptions

> **TranscribeStreamOptions** = `Omit`\<[`TranscribeOptions`](TranscribeOptions.md), `"audio"`\> & `object`

`transcribeStream()` takes frames instead of a whole buffer.

## Type Declaration

### audio

> **audio**: `AsyncIterable`\<`Buffer` \| `Uint8Array`\>
