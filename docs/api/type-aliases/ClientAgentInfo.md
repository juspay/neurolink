[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientAgentInfo

# Type Alias: ClientAgentInfo

> **ClientAgentInfo** = `object`

Defined in: [types/client.ts:350](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L350)

Agent information

## Properties

### id

> **id**: `string`

Defined in: [types/client.ts:352](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L352)

Agent ID

---

### name

> **name**: `string`

Defined in: [types/client.ts:354](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L354)

Agent name

---

### description

> **description**: `string`

Defined in: [types/client.ts:356](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L356)

Agent description

---

### tools?

> `optional` **tools?**: `string`[]

Defined in: [types/client.ts:358](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L358)

Available tools for this agent

---

### capabilities?

> `optional` **capabilities?**: `object`

Defined in: [types/client.ts:360](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L360)

Agent capabilities

#### streaming

> **streaming**: `boolean`

#### multimodal

> **multimodal**: `boolean`

#### memory

> **memory**: `boolean`
