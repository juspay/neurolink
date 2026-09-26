[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceBrain

# Type Alias: LiveKitVoiceBrain

> **LiveKitVoiceBrain** = `object`

The brain's public surface: stream the assistant reply as text deltas.
The transport layer converts these deltas into audio (TTS).

## Properties

### streamReply

> **streamReply**: (`turn`) => `AsyncGenerator`\<`string`, `void`, `unknown`\>

#### Parameters

##### turn

[`LiveKitBrainTurn`](LiveKitBrainTurn.md)

#### Returns

`AsyncGenerator`\<`string`, `void`, `unknown`\>
