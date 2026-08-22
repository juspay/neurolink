[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVadConfig

# Type Alias: LiveKitVadConfig

> **LiveKitVadConfig** = `object`

Defined in: [types/livekit.ts:100](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L100)

Silero VAD tuning. Stricter values reject background noise (higher threshold,
longer minimum speech). Durations are in seconds.

## Properties

### activationThreshold?

> `optional` **activationThreshold?**: `number`

Defined in: [types/livekit.ts:102](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L102)

Probability cutoff for "this is speech" (default 0.6). Higher = stricter.

---

### minSpeechDuration?

> `optional` **minSpeechDuration?**: `number`

Defined in: [types/livekit.ts:104](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L104)

Minimum speech length before a turn starts, seconds (default 0.2).

---

### minSilenceDuration?

> `optional` **minSilenceDuration?**: `number`

Defined in: [types/livekit.ts:106](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L106)

Silence before a turn ends, seconds (default 0.6) — tolerates pauses.
