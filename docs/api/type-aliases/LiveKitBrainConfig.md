[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitBrainConfig

# Type Alias: LiveKitBrainConfig

> **LiveKitBrainConfig** = `object`

Defined in: [types/livekit.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L39)

Configuration for the transport-agnostic voice brain.

The brain owns the conversation: it calls `neurolink.stream()` with a stable
`conversationId` so NeuroLink's memory layer is the source of truth, and it
leaves tool-calling to the NeuroLink instance.

## Properties

### neurolink

> **neurolink**: [`LiveKitNeuroLinkStreamer`](LiveKitNeuroLinkStreamer.md)

Defined in: [types/livekit.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L41)

Configured NeuroLink instance (memory + tools registered on it).

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/livekit.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L43)

LLM provider name passed to `stream()` (e.g. "bedrock").

---

### model?

> `optional` **model?**: `string`

Defined in: [types/livekit.ts:45](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L45)

LLM model name passed to `stream()` (e.g. "claude-sonnet-4-6").

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/livekit.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L47)

System prompt applied to every turn.

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/livekit.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L49)

Sampling temperature for spoken-style responses.

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/livekit.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L51)

Upper bound on tokens per turn.

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/livekit.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L53)

Optional user identifier recorded alongside memory.
