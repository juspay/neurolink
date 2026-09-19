[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleStreamingAudioEncoding

# Type Alias: GoogleStreamingAudioEncoding

> **GoogleStreamingAudioEncoding** = `"PCM"` \| `"OGG_OPUS"`

Defined in: [types/tts.ts:238](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L238)

Audio encodings Google's _streaming_ synthesis endpoint accepts.

Deliberately a separate type from [GoogleAudioEncoding](GoogleAudioEncoding.md): the
batch and streaming endpoints do not accept the same set. `MP3` and
`LINEAR16` are valid for batch and rejected by streaming with
`INVALID_ARGUMENT: Unsupported audio encoding`, while `PCM` — raw
16-bit signed LE, headerless — exists only on the streaming side.
