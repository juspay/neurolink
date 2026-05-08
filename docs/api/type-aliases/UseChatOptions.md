[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseChatOptions

# Type Alias: UseChatOptions

> **UseChatOptions** = `object`

Defined in: [types/client.ts:556](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L556)

useChat hook options

## Properties

### api?

> `optional` **api?**: `string`

Defined in: [types/client.ts:558](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L558)

API endpoint for chat

---

### agentId?

> `optional` **agentId?**: `string`

Defined in: [types/client.ts:560](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L560)

Agent ID to use

---

### initialMessages?

> `optional` **initialMessages?**: [`ClientChatMessage`](ClientChatMessage.md)[]

Defined in: [types/client.ts:562](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L562)

Initial messages

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/client.ts:564](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L564)

Session ID for conversation continuity

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/client.ts:566](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L566)

System prompt

---

### onResponse?

> `optional` **onResponse?**: (`response`) => `void` \| `Promise`\<`void`\>

Defined in: [types/client.ts:568](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L568)

Called when response starts

#### Parameters

##### response

`Response`

#### Returns

`void` \| `Promise`\<`void`\>

---

### onFinish?

> `optional` **onFinish?**: (`message`) => `void`

Defined in: [types/client.ts:570](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L570)

Called when response finishes

#### Parameters

##### message

[`ClientChatMessage`](ClientChatMessage.md)

#### Returns

`void`

---

### onError?

> `optional` **onError?**: (`error`) => `void`

Defined in: [types/client.ts:572](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L572)

Called on error

#### Parameters

##### error

[`ClientApiError`](ClientApiError.md)

#### Returns

`void`

---

### onToolCall?

> `optional` **onToolCall?**: (`toolCall`) => `void`

Defined in: [types/client.ts:574](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L574)

Called for each tool call

#### Parameters

##### toolCall

[`StreamToolCall`](StreamToolCall.md)

#### Returns

`void`

---

### body?

> `optional` **body?**: [`UnknownRecord`](UnknownRecord.md)

Defined in: [types/client.ts:576](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L576)

Request body customization

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/client.ts:578](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L578)

Request headers

---

### credentials?

> `optional` **credentials?**: `RequestCredentials`

Defined in: [types/client.ts:580](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L580)

Credentials mode

---

### generateId?

> `optional` **generateId?**: () => `string`

Defined in: [types/client.ts:582](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L582)

Generate message ID

#### Returns

`string`
