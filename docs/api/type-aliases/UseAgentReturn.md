[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseAgentReturn

# Type Alias: UseAgentReturn

> **UseAgentReturn** = `object`

useAgent hook return type

## Properties

### execute

> **execute**: (`input`, `options?`) => `Promise`\<[`ClientAgentExecuteResult`](ClientAgentExecuteResult.md)\>

Execute the agent

#### Parameters

##### input

`string`

##### options?

`Partial`\<[`ClientAgentExecuteOptions`](ClientAgentExecuteOptions.md)\>

#### Returns

`Promise`\<[`ClientAgentExecuteResult`](ClientAgentExecuteResult.md)\>

---

### stream

> **stream**: (`input`, `callbacks?`) => `Promise`\<`void`\>

Stream execution

#### Parameters

##### input

`string`

##### callbacks?

[`ClientStreamCallbacks`](ClientStreamCallbacks.md)

#### Returns

`Promise`\<`void`\>

---

### sessionId

> **sessionId**: `string` \| `null`

Current session ID

---

### setSessionId

> **setSessionId**: (`sessionId`) => `void`

Set session ID

#### Parameters

##### sessionId

`string` \| `null`

#### Returns

`void`

---

### isLoading

> **isLoading**: `boolean`

Loading state

---

### isStreaming

> **isStreaming**: `boolean`

Streaming state

---

### result

> **result**: [`ClientAgentExecuteResult`](ClientAgentExecuteResult.md) \| `null`

Last result

---

### error

> **error**: [`ClientApiError`](ClientApiError.md) \| `null`

Error state

---

### clearError

> **clearError**: () => `void`

Clear error

#### Returns

`void`

---

### abort

> **abort**: () => `void`

Abort current execution

#### Returns

`void`
