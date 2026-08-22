[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceBrain

# Type Alias: LiveKitVoiceBrain

> **LiveKitVoiceBrain** = `object`

Defined in: [types/livekit.ts:70](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L70)

The brain's public surface: stream the assistant reply as text deltas.
The transport layer converts these deltas into audio (TTS).

## Properties

### streamReply

> **streamReply**: (`turn`) => `AsyncGenerator`\<`string`, `void`, `unknown`\>

Defined in: [types/livekit.ts:71](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L71)

#### Parameters

##### turn

[`LiveKitBrainTurn`](LiveKitBrainTurn.md)

#### Returns

`AsyncGenerator`\<`string`, `void`, `unknown`\>
