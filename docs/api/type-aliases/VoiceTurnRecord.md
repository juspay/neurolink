[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoiceTurnRecord

# Type Alias: VoiceTurnRecord

> **VoiceTurnRecord** = `object`

One finished exchange of a voice call, as handed to the writer.

## Properties

### turnId

> **turnId**: `string`

The assistant message id, or a synthetic id for a turn cut off by shutdown or barge-in.

---

### userMessage

> **userMessage**: `string`

---

### aiResponse

> **aiResponse**: `string`

---

### interrupted

> **interrupted**: `boolean`

The reply was cut off.

---

### callEnded

> **callEnded**: `boolean`

The call ended while this exchange was open.

---

### startTime

> **startTime**: `Date`

---

### events?

> `optional` **events?**: [`StreamEventSequence`](StreamEventSequence.md)[]

Tool events of the exchange, in the shape typed chat stores.
