[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingStickiness

# Type Alias: ToolRoutingStickiness

> **ToolRoutingStickiness** = `object`

Defined in: [types/toolRouting.ts:201](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L201)

Internal stickiness entry for `ToolRoutingCache`.

## Properties

### serverIds

> **serverIds**: `string`[]

Defined in: [types/toolRouting.ts:202](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L202)

---

### turnsRemaining

> **turnsRemaining**: `number`

Defined in: [types/toolRouting.ts:204](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L204)

Turn counter — decremented on each routing turn, removed when it hits 0.
