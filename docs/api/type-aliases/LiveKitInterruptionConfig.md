[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitInterruptionConfig

# Type Alias: LiveKitInterruptionConfig

> **LiveKitInterruptionConfig** = `object`

Defined in: [types/livekit.ts:135](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L135)

Interruption (barge-in) tuning. Requiring real words / a minimum duration
stops background noise from cutting off the assistant.

## Properties

### minWords?

> `optional` **minWords?**: `number`

Defined in: [types/livekit.ts:137](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L137)

Minimum recognized words to count as an interruption (default 2).

---

### minDuration?

> `optional` **minDuration?**: `number`

Defined in: [types/livekit.ts:139](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L139)

Minimum audio duration to count as an interruption, ms (default 600).
