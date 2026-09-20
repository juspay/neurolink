[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingStickiness

# Type Alias: ToolRoutingStickiness

> **ToolRoutingStickiness** = `object`

Defined in: [types/toolRouting.ts:213](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L213)

Internal stickiness entry for `ToolRoutingCache`.

## Properties

### serverIds

> **serverIds**: `string`[]

Defined in: [types/toolRouting.ts:214](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L214)

---

### turnsRemaining

> **turnsRemaining**: `number`

Defined in: [types/toolRouting.ts:216](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L216)

Turn counter — decremented on each routing turn, removed when it hits 0.
