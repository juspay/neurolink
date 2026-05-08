[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseAgentReturn

# Type Alias: UseAgentReturn

> **UseAgentReturn** = `object`

Defined in: [types/client.ts:643](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L643)

useAgent hook return type

## Properties

### execute

> **execute**: (`input`, `options?`) => `Promise`\<[`ClientAgentExecuteResult`](ClientAgentExecuteResult.md)\>

Defined in: [types/client.ts:645](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L645)

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

Defined in: [types/client.ts:650](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L650)

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

Defined in: [types/client.ts:652](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L652)

Current session ID

---

### setSessionId

> **setSessionId**: (`sessionId`) => `void`

Defined in: [types/client.ts:654](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L654)

Set session ID

#### Parameters

##### sessionId

`string` \| `null`

#### Returns

`void`

---

### isLoading

> **isLoading**: `boolean`

Defined in: [types/client.ts:656](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L656)

Loading state

---

### isStreaming

> **isStreaming**: `boolean`

Defined in: [types/client.ts:658](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L658)

Streaming state

---

### result

> **result**: [`ClientAgentExecuteResult`](ClientAgentExecuteResult.md) \| `null`

Defined in: [types/client.ts:660](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L660)

Last result

---

### error

> **error**: [`ClientApiError`](ClientApiError.md) \| `null`

Defined in: [types/client.ts:662](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L662)

Error state

---

### clearError

> **clearError**: () => `void`

Defined in: [types/client.ts:664](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L664)

Clear error

#### Returns

`void`

---

### abort

> **abort**: () => `void`

Defined in: [types/client.ts:666](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L666)

Abort current execution

#### Returns

`void`
