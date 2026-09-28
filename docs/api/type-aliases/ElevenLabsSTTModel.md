[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElevenLabsSTTModel

# Type Alias: ElevenLabsSTTModel

> **ElevenLabsSTTModel** = `"scribe_v2"` \| `"scribe_v2_medical"` \| `"scribe_v1"` \| `"scribe_v1_experimental"` \| `string` & `object`

Scribe model ids the batch `speech-to-text` endpoint accepts. `scribe_v2`
is the current model and the default; `scribe_v2_medical` is its clinical
fine-tune; `scribe_v1` (and the experimental variant) are deprecated. The
`(string & {})` member keeps the union open so a newly released id can be
used without a cast.
