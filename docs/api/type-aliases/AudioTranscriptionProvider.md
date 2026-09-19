[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioTranscriptionProvider

# Type Alias: AudioTranscriptionProvider

> **AudioTranscriptionProvider** = `"openai"` \| `"google"` \| `"azure"`

Defined in: [types/file.ts:462](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L462)

A transcription backend `AudioProcessor` can drive (#413).

Deliberately narrower than `AudioProcessorOptions.provider`, which stays a
free-form `string` on the public surface for backward compatibility: a
caller's spelling is normalised onto this union (accepting aliases such as
"whisper" for "openai") and an unrecognised one is reported rather than
silently ignored.
