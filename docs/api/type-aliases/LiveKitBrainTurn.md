[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitBrainTurn

# Type Alias: LiveKitBrainTurn

> **LiveKitBrainTurn** = `object`

Defined in: [types/livekit.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L57)

A single user turn handed to the brain.

## Properties

### transcript

> **transcript**: `string`

Defined in: [types/livekit.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L59)

Final transcript of the user's utterance.

---

### conversationId

> **conversationId**: `string`

Defined in: [types/livekit.ts:61](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L61)

Stable conversation id keying NeuroLink memory for this session.

---

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [types/livekit.ts:63](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L63)

Cancellation signal; aborting stops the in-flight LLM and tool calls.
