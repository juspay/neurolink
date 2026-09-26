[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioTranscriptionSelection

# Type Alias: AudioTranscriptionSelection

> **AudioTranscriptionSelection** = \{ `provider`: [`AudioTranscriptionProvider`](AudioTranscriptionProvider.md); `label`: `string`; `reason?`: `undefined`; \} \| \{ `provider?`: `undefined`; `label?`: `undefined`; `reason`: `string`; \}

Defined in: [types/file.ts:631](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L631)

Outcome of choosing a transcription backend (#413).

A union rather than a nullable provider so the "nothing usable" case is
forced to carry the reason — the failure mode this replaces was every
unavailable backend collapsing into an indistinguishable empty result.
