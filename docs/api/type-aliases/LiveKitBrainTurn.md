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

---

### userId?

> `optional` **userId?**: `string`

User the conversation belongs to for THIS call, overriding the brain's
static `userId`. A call whose memory binding verified passes the bound
user here so the turn is stored under the person on the call.

---

### ephemeral?

> `optional` **ephemeral?**: `boolean`

Run this turn without reading or writing conversation memory. Used for the
agent's opening greeting on a bound call, which is an instruction to the
agent and must not land in the person's conversation as something they said.
