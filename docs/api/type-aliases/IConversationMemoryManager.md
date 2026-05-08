[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / IConversationMemoryManager

# Type Alias: IConversationMemoryManager

> **IConversationMemoryManager** = `object`

Defined in: [types/conversationMemoryInterface.ts:19](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversationMemoryInterface.ts#L19)

Common type for all conversation memory manager implementations.
Provides a consistent API for storing, retrieving, and managing conversation history.

## Properties

### config

> **config**: [`ConversationMemoryConfig`](ConversationMemoryConfig.md)

Defined in: [types/conversationMemoryInterface.ts:20](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversationMemoryInterface.ts#L20)

## Methods

### initialize()

> **initialize**(): `void` \| `Promise`\<`void`\>

Defined in: [types/conversationMemoryInterface.ts:23](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversationMemoryInterface.ts#L23)

Initialize the memory manager

#### Returns

`void` \| `Promise`\<`void`\>

---

### storeConversationTurn()

> **storeConversationTurn**(`options`): `Promise`\<`void`\>

Defined in: [types/conversationMemoryInterface.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversationMemoryInterface.ts#L26)

Store a conversation turn

#### Parameters

##### options

[`StoreConversationTurnOptions`](StoreConversationTurnOptions.md)

#### Returns

`Promise`\<`void`\>

---

### getSession()

> **getSession**(`sessionId`, `userId?`): [`SessionMemory`](SessionMemory.md) \| `Promise`\<[`SessionMemory`](SessionMemory.md) \| `undefined`\> \| `undefined`

Defined in: [types/conversationMemoryInterface.ts:29](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversationMemoryInterface.ts#L29)

Get session by ID

#### Parameters

##### sessionId

`string`

##### userId?

`string`

#### Returns

[`SessionMemory`](SessionMemory.md) \| `Promise`\<[`SessionMemory`](SessionMemory.md) \| `undefined`\> \| `undefined`

---

### buildContextMessages()

> **buildContextMessages**(`sessionId`, `userId?`, `enableSummarization?`, `requestId?`): [`ChatMessage`](ChatMessage.md)[] \| `Promise`\<[`ChatMessage`](ChatMessage.md)[]\>

Defined in: [types/conversationMemoryInterface.ts:35](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversationMemoryInterface.ts#L35)

Build context messages for AI prompt injection

#### Parameters

##### sessionId

`string`

##### userId?

`string`

##### enableSummarization?

`boolean`

##### requestId?

`string`

#### Returns

[`ChatMessage`](ChatMessage.md)[] \| `Promise`\<[`ChatMessage`](ChatMessage.md)[]\>

---

### clearSession()

> **clearSession**(`sessionId`, `userId?`): `boolean` \| `Promise`\<`boolean`\>

Defined in: [types/conversationMemoryInterface.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversationMemoryInterface.ts#L43)

Clear a specific session

#### Parameters

##### sessionId

`string`

##### userId?

`string`

#### Returns

`boolean` \| `Promise`\<`boolean`\>

---

### clearAllSessions()

> **clearAllSessions**(): `void` \| `Promise`\<`void`\>

Defined in: [types/conversationMemoryInterface.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversationMemoryInterface.ts#L46)

Clear all sessions

#### Returns

`void` \| `Promise`\<`void`\>

---

### getStats()

> **getStats**(): [`ConversationMemoryStats`](ConversationMemoryStats.md) \| `Promise`\<[`ConversationMemoryStats`](ConversationMemoryStats.md)\>

Defined in: [types/conversationMemoryInterface.ts:49](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversationMemoryInterface.ts#L49)

Get memory statistics

#### Returns

[`ConversationMemoryStats`](ConversationMemoryStats.md) \| `Promise`\<[`ConversationMemoryStats`](ConversationMemoryStats.md)\>

---

### getSessionMessages()

> **getSessionMessages**(`sessionId`, `userId?`): `Promise`\<[`ChatMessage`](ChatMessage.md)[]\>

Defined in: [types/conversationMemoryInterface.ts:52](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversationMemoryInterface.ts#L52)

Get raw messages array for a session (no context filtering or summarization)

#### Parameters

##### sessionId

`string`

##### userId?

`string`

#### Returns

`Promise`\<[`ChatMessage`](ChatMessage.md)[]\>

---

### setSessionMessages()

> **setSessionMessages**(`sessionId`, `messages`, `userId?`): `Promise`\<`void`\>

Defined in: [types/conversationMemoryInterface.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversationMemoryInterface.ts#L58)

Replace the entire messages array for a session

#### Parameters

##### sessionId

`string`

##### messages

[`ChatMessage`](ChatMessage.md)[]

##### userId?

`string`

#### Returns

`Promise`\<`void`\>

---

### close()?

> `optional` **close**(): `Promise`\<`void`\>

Defined in: [types/conversationMemoryInterface.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversationMemoryInterface.ts#L65)

Close/shutdown the memory manager and release resources (e.g., Redis connections)

#### Returns

`Promise`\<`void`\>
