[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitInterruptionConfig

# Type Alias: LiveKitInterruptionConfig

> **LiveKitInterruptionConfig** = `object`

Interruption (barge-in) tuning. Requiring real words / a minimum duration
stops background noise from cutting off the assistant.

## Properties

### minWords?

> `optional` **minWords?**: `number`

Minimum recognized words to count as an interruption (default 2).

---

### minDuration?

> `optional` **minDuration?**: `number`

Minimum audio duration to count as an interruption, ms (default 600).
