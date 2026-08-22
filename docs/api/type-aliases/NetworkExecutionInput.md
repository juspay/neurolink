[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkExecutionInput

# Type Alias: NetworkExecutionInput

> **NetworkExecutionInput** = `object`

Defined in: [types/agentNetwork.ts:377](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L377)

Input for network execution

## Properties

### message

> **message**: `string` \| [`CoreMessage`](CoreMessage.md)[]

Defined in: [types/agentNetwork.ts:379](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L379)

The task or message to process

---

### threadId?

> `optional` **threadId?**: `string`

Defined in: [types/agentNetwork.ts:382](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L382)

Thread ID for conversation context

---

### resourceId?

> `optional` **resourceId?**: `string`

Defined in: [types/agentNetwork.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L385)

User/resource identifier

---

### context?

> `optional` **context?**: `Record`\<`string`, `unknown`\>

Defined in: [types/agentNetwork.ts:388](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L388)

Additional context
