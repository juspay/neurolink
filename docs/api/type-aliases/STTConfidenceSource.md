[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTConfidenceSource

# Type Alias: STTConfidenceSource

> **STTConfidenceSource** = `"word_logprobs"` \| `"language_probability"` \| `"none"`

Where a provider's `STTResult.confidence` came from, when it has to say —
Scribe reports a per-word `logprob` on some responses and only a
language-detection probability on others, and a caller reading the number
should know which it is getting. `"none"` means the provider reported no
transcript-level signal at all and the field is 0.
