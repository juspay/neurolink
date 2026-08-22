[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkPrimitive

# Type Alias: NetworkPrimitive

> **NetworkPrimitive** = `object`

Defined in: [types/agentNetwork.ts:180](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L180)

Base primitive type for all orchestrable components

## Properties

### id

> **id**: `string`

Defined in: [types/agentNetwork.ts:182](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L182)

Unique identifier

---

### type

> **type**: [`NetworkPrimitiveType`](NetworkPrimitiveType.md)

Defined in: [types/agentNetwork.ts:185](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L185)

Type of primitive

---

### name

> **name**: `string`

Defined in: [types/agentNetwork.ts:188](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L188)

Human-readable name

---

### description

> **description**: `string`

Defined in: [types/agentNetwork.ts:191](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L191)

Description for routing decisions

---

### inputSchema?

> `optional` **inputSchema?**: `z.ZodSchema`

Defined in: [types/agentNetwork.ts:194](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L194)

Input schema for validation

---

### outputSchema?

> `optional` **outputSchema?**: `z.ZodSchema`

Defined in: [types/agentNetwork.ts:197](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L197)

Output schema for validation
