[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitBrainTurn

# Type Alias: LiveKitBrainTurn

> **LiveKitBrainTurn** = `object`

A single user turn handed to the brain.

## Properties

### transcript

> **transcript**: `string`

Final transcript of the user's utterance.

---

### conversationId

> **conversationId**: `string`

Stable conversation id keying NeuroLink memory for this session.

---

### signal?

> `optional` **signal?**: `AbortSignal`

Cancellation signal; aborting stops the in-flight LLM and tool calls.
