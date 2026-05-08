[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseAgentOptions

# Type Alias: UseAgentOptions

> **UseAgentOptions** = `object`

Defined in: [types/client.ts:625](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L625)

useAgent hook options

## Properties

### agentId

> **agentId**: `string`

Defined in: [types/client.ts:627](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L627)

Agent ID

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/client.ts:629](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L629)

Initial session ID

---

### onResponse?

> `optional` **onResponse?**: (`result`) => `void`

Defined in: [types/client.ts:631](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L631)

Called on agent response

#### Parameters

##### result

[`ClientAgentExecuteResult`](ClientAgentExecuteResult.md)

#### Returns

`void`

---

### onError?

> `optional` **onError?**: (`error`) => `void`

Defined in: [types/client.ts:633](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L633)

Called on error

#### Parameters

##### error

[`ClientApiError`](ClientApiError.md)

#### Returns

`void`

---

### onToolCall?

> `optional` **onToolCall?**: (`toolCall`) => `void`

Defined in: [types/client.ts:635](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L635)

Called when tool is called

#### Parameters

##### toolCall

[`StreamToolCall`](StreamToolCall.md)

#### Returns

`void`

---

### initialInput?

> `optional` **initialInput?**: `string`

Defined in: [types/client.ts:637](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L637)

Auto-execute on mount with initial input
