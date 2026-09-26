[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseChatOptions

# Type Alias: UseChatOptions

> **UseChatOptions** = `object`

useChat hook options

## Properties

### api?

> `optional` **api?**: `string`

API endpoint for chat

---

### agentId?

> `optional` **agentId?**: `string`

Agent ID to use

---

### initialMessages?

> `optional` **initialMessages?**: [`ClientChatMessage`](ClientChatMessage.md)[]

Initial messages

---

### sessionId?

> `optional` **sessionId?**: `string`

Session ID for conversation continuity

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

System prompt

---

### onResponse?

> `optional` **onResponse?**: (`response`) => `void` \| `Promise`\<`void`\>

Called when response starts

#### Parameters

##### response

`Response`

#### Returns

`void` \| `Promise`\<`void`\>

---

### onFinish?

> `optional` **onFinish?**: (`message`) => `void`

Called when response finishes

#### Parameters

##### message

[`ClientChatMessage`](ClientChatMessage.md)

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

Called for each tool call

#### Parameters

##### toolCall

[`StreamToolCall`](StreamToolCall.md)

#### Returns

`void`

---

### body?

> `optional` **body?**: [`UnknownRecord`](UnknownRecord.md)

Request body customization

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Request headers

---

### credentials?

> `optional` **credentials?**: `RequestCredentials`

Credentials mode

---

### generateId?

> `optional` **generateId?**: () => `string`

Generate message ID

#### Returns

`string`
