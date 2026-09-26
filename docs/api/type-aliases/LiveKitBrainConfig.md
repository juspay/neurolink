[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitBrainConfig

# Type Alias: LiveKitBrainConfig

> **LiveKitBrainConfig** = `object`

Configuration for the transport-agnostic voice brain.

The brain owns the conversation: it calls `neurolink.stream()` with a stable
`conversationId` so NeuroLink's memory layer is the source of truth, and it
leaves tool-calling to the NeuroLink instance.

## Properties

### neurolink

> **neurolink**: [`LiveKitNeuroLinkStreamer`](LiveKitNeuroLinkStreamer.md)

Configured NeuroLink instance (memory + tools registered on it).

---

### provider?

> `optional` **provider?**: `string`

LLM provider name passed to `stream()` (e.g. "bedrock").

---

### model?

> `optional` **model?**: `string`

LLM model name passed to `stream()` (e.g. "claude-sonnet-4-6").

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

System prompt applied to every turn.

---

### temperature?

> `optional` **temperature?**: `number`

Sampling temperature for spoken-style responses.

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Upper bound on tokens per turn.

---

### userId?

> `optional` **userId?**: `string`

Optional user identifier recorded alongside memory.
