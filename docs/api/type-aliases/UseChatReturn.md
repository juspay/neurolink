[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseChatReturn

# Type Alias: UseChatReturn

> **UseChatReturn** = `object`

Defined in: [types/client.ts:588](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L588)

useChat hook return type

## Properties

### messages

> **messages**: [`ClientChatMessage`](ClientChatMessage.md)[]

Defined in: [types/client.ts:590](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L590)

Chat messages

---

### input

> **input**: `string`

Defined in: [types/client.ts:592](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L592)

Current input value

---

### setInput

> **setInput**: (`input`) => `void`

Defined in: [types/client.ts:594](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L594)

Set input value

#### Parameters

##### input

`string`

#### Returns

`void`

---

### handleInputChange

> **handleInputChange**: (`e`) => `void`

Defined in: [types/client.ts:596](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L596)

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

Defined in: [types/client.ts:598](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L598)

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

Defined in: [types/client.ts:603](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L603)

Append a message

#### Parameters

##### message

`Omit`\<[`ClientChatMessage`](ClientChatMessage.md), `"id"` \| `"createdAt"`\>

#### Returns

`Promise`\<`string` \| `null` \| `undefined`\>

---

### reload

> **reload**: () => `Promise`\<`string` \| `null` \| `undefined`\>

Defined in: [types/client.ts:607](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L607)

Reload the last message

#### Returns

`Promise`\<`string` \| `null` \| `undefined`\>

---

### stop

> **stop**: () => `void`

Defined in: [types/client.ts:609](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L609)

Stop generation

#### Returns

`void`

---

### setMessages

> **setMessages**: (`messages`) => `void`

Defined in: [types/client.ts:611](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L611)

Set messages directly

#### Parameters

##### messages

[`ClientChatMessage`](ClientChatMessage.md)[]

#### Returns

`void`

---

### isLoading

> **isLoading**: `boolean`

Defined in: [types/client.ts:613](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L613)

Loading state

---

### error

> **error**: [`ClientApiError`](ClientApiError.md) \| `null`

Defined in: [types/client.ts:615](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L615)

Error state

---

### clearError

> **clearError**: () => `void`

Defined in: [types/client.ts:617](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L617)

Clear error

#### Returns

`void`

---

### toolCalls

> **toolCalls**: [`StreamToolCall`](StreamToolCall.md)[]

Defined in: [types/client.ts:619](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L619)

Current tool calls being executed
