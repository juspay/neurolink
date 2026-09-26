[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitTurnConfig

# Type Alias: LiveKitTurnConfig

> **LiveKitTurnConfig** = `object`

Turn-detection (end-of-utterance) tuning.

`mode` selects what decides the user's turn is over:

- `"vad"` — Silero VAD silence (see `LiveKitVadConfig.minSilenceDuration`).
  Tolerates natural mid-sentence pauses; the turn only ends after a full
  silence window. This mirrors Clairvoyance's behavior.
- `"stt"` — the STT provider's own endpoint detection (e.g. Soniox). Often
  much faster/aggressive — short pauses can prematurely split one utterance
  into several turns.
- `"realtime_llm"` / `"manual"` — advanced/manual strategies.

`minEndpointingDelay` / `maxEndpointingDelay` are the framework's endpointing
window in milliseconds (in VAD mode the effective end delay is
`max(VAD silence, minEndpointingDelay)`).

## Properties

### mode?

> `optional` **mode?**: `"stt"` \| `"vad"` \| `"realtime_llm"` \| `"manual"`

---

### minEndpointingDelay?

> `optional` **minEndpointingDelay?**: `number`

---

### maxEndpointingDelay?

> `optional` **maxEndpointingDelay?**: `number`
