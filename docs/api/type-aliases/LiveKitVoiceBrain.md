[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceBrain

# Type Alias: LiveKitVoiceBrain

> **LiveKitVoiceBrain** = `object`

Defined in: [types/livekit.ts:70](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L70)

The brain's public surface: stream the assistant reply as text deltas.
The transport layer converts these deltas into audio (TTS).

## Properties

### streamReply

> **streamReply**: (`turn`) => `AsyncGenerator`\<`string`, `void`, `unknown`\>

Defined in: [types/livekit.ts:71](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L71)

#### Parameters

##### turn

[`LiveKitBrainTurn`](LiveKitBrainTurn.md)

#### Returns

`AsyncGenerator`\<`string`, `void`, `unknown`\>
