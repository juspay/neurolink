[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / InternalStreamEvent

# Type Alias: InternalStreamEvent

> **InternalStreamEvent** = `object`

Defined in: [types/common.ts:161](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L161)

Stream event types for real-time communication

## Properties

### type

> **type**: `"stream:chunk"` \| `"stream:complete"` \| `"stream:error"`

Defined in: [types/common.ts:162](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L162)

---

### content?

> `optional` **content?**: `string`

Defined in: [types/common.ts:163](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L163)

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Defined in: [types/common.ts:164](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L164)

---

### timestamp

> **timestamp**: `number`

Defined in: [types/common.ts:165](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L165)
