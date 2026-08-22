[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / InternalStreamEvent

# Type Alias: InternalStreamEvent

> **InternalStreamEvent** = `object`

Defined in: [types/common.ts:161](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L161)

Stream event types for real-time communication

## Properties

### type

> **type**: `"stream:chunk"` \| `"stream:complete"` \| `"stream:error"`

Defined in: [types/common.ts:162](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L162)

---

### content?

> `optional` **content?**: `string`

Defined in: [types/common.ts:163](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L163)

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Defined in: [types/common.ts:164](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L164)

---

### timestamp

> **timestamp**: `number`

Defined in: [types/common.ts:165](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L165)
