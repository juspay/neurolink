[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WhistleStreamStep

# Type Alias: WhistleStreamStep

> **WhistleStreamStep** = `object`

One step of the engine's native stream: what this chunk committed, and the unconfirmed tail.

## Properties

### text

> **text**: `string`

---

### words

> **words**: [`WhistleWord`](WhistleWord.md)[]

---

### pending

> **pending**: `string`

---

### language

> **language**: `string` \| `null`

---

### received

> **received**: `number`

Seconds of audio received so far.

---

### passMs

> **passMs**: `number`
