[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RecordConversationTurnOptions

# Type Alias: RecordConversationTurnOptions

> **RecordConversationTurnOptions** = `object`

Input to `NeuroLink.recordConversationTurn`: one finished turn from a
transport that does not go through generate()/stream() (a voice call),
written to the same conversation memory typed chat uses.

## Properties

### sessionId

> **sessionId**: `string`

Conversation to append to. Must not contain ":" (it is part of the stored key).

---

### userId

> **userId**: `string`

Owner of the conversation. Required: typed chat falls back to a shared
placeholder user when it is missing, and a spoken turn must never land
there.

---

### userMessage

> **userMessage**: `string`

What the person said. Must be non-blank.

---

### aiResponse

> **aiResponse**: `string`

What the assistant said (or the closing note for a cut-off turn). Must be non-blank unless `events` carries tool activity.

---

### modality?

> `optional` **modality?**: [`ConversationModality`](ConversationModality.md)

How the turn was entered. Stamped on both stored messages.

---

### turnId?

> `optional` **turnId?**: `string`

Idempotency key. Recording the same `turnId` again is a no-op.

---

### interrupted?

> `optional` **interrupted?**: `boolean`

The assistant message was cut off before it finished.

---

### callEnded?

> `optional` **callEnded?**: `boolean`

The call ended while this turn was open.

---

### events?

> `optional` **events?**: [`StreamEventSequence`](StreamEventSequence.md)[]

Tool and UI events of the turn, in the shape typed chat stores.

---

### startTime?

> `optional` **startTime?**: `Date`

When the turn started.

---

### provider?

> `optional` **provider?**: `string`

Provider and model that answered, for token-threshold selection.

---

### model?

> `optional` **model?**: `string`

---

### requestId?

> `optional` **requestId?**: `string`

Observability request identifier.

---

### enableSummarization?

> `optional` **enableSummarization?**: `boolean`

Per-call override of summarization, as on generate()/stream().

---

### memory?

> `optional` **memory?**: `object`

Per-call long-term memory switches, as on generate()/stream().

#### enabled?

> `optional` **enabled?**: `boolean`

#### write?

> `optional` **write?**: `boolean`
