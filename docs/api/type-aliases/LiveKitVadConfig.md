[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVadConfig

# Type Alias: LiveKitVadConfig

> **LiveKitVadConfig** = `object`

Silero VAD tuning. Stricter values reject background noise (higher threshold,
longer minimum speech). Durations are in seconds.

## Properties

### activationThreshold?

> `optional` **activationThreshold?**: `number`

Probability cutoff for "this is speech" (default 0.6). Higher = stricter.

---

### minSpeechDuration?

> `optional` **minSpeechDuration?**: `number`

Minimum speech length before a turn starts, seconds (default 0.2).

---

### minSilenceDuration?

> `optional` **minSilenceDuration?**: `number`

Silence before a turn ends, seconds (default 0.6) — tolerates pauses.
