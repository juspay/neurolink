[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseAgentOptions

# Type Alias: UseAgentOptions

> **UseAgentOptions** = `object`

useAgent hook options

## Properties

### agentId

> **agentId**: `string`

Agent ID

---

### sessionId?

> `optional` **sessionId?**: `string`

Initial session ID

---

### onResponse?

> `optional` **onResponse?**: (`result`) => `void`

Called on agent response

#### Parameters

##### result

[`ClientAgentExecuteResult`](ClientAgentExecuteResult.md)

#### Returns

`void`

---

### onError?

> `optional` **onError?**: (`error`) => `void`

Called on error

#### Parameters

##### error

[`ClientApiError`](ClientApiError.md)

#### Returns

`void`

---

### onToolCall?

> `optional` **onToolCall?**: (`toolCall`) => `void`

Called when tool is called

#### Parameters

##### toolCall

[`StreamToolCall`](StreamToolCall.md)

#### Returns

`void`

---

### initialInput?

> `optional` **initialInput?**: `string`

Auto-execute on mount with initial input
