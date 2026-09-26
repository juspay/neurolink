[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseChatReturn

# Type Alias: UseChatReturn

> **UseChatReturn** = `object`

useChat hook return type

## Properties

### messages

> **messages**: [`ClientChatMessage`](ClientChatMessage.md)[]

Chat messages

---

### input

> **input**: `string`

Current input value

---

### setInput

> **setInput**: (`input`) => `void`

Set input value

#### Parameters

##### input

`string`

#### Returns

`void`

---

### handleInputChange

> **handleInputChange**: (`e`) => `void`

Handle input change

#### Parameters

##### e

###### target

\{ `value`: `string`; \}

###### target.value

`string`

#### Returns

`void`

---

### handleSubmit

> **handleSubmit**: (`e?`, `options?`) => `void`

Submit message

#### Parameters

##### e?

###### preventDefault?

() => `void`

##### options?

###### data?

[`UnknownRecord`](UnknownRecord.md)

#### Returns

`void`

---

### append

> **append**: (`message`) => `Promise`\<`string` \| `null` \| `undefined`\>

Append a message

#### Parameters

##### message

`Omit`\<[`ClientChatMessage`](ClientChatMessage.md), `"id"` \| `"createdAt"`\>

#### Returns

`Promise`\<`string` \| `null` \| `undefined`\>

---

### reload

> **reload**: () => `Promise`\<`string` \| `null` \| `undefined`\>

Reload the last message

#### Returns

`Promise`\<`string` \| `null` \| `undefined`\>

---

### stop

> **stop**: () => `void`

Stop generation

#### Returns

`void`

---

### setMessages

> **setMessages**: (`messages`) => `void`

Set messages directly

#### Parameters

##### messages

[`ClientChatMessage`](ClientChatMessage.md)[]

#### Returns

`void`

---

### isLoading

> **isLoading**: `boolean`

Loading state

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

### toolCalls

> **toolCalls**: [`StreamToolCall`](StreamToolCall.md)[]

Current tool calls being executed
