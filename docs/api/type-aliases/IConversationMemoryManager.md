[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IConversationMemoryManager

# Type Alias: IConversationMemoryManager

> **IConversationMemoryManager** = `object`

Defined in: [types/conversationMemoryInterface.ts:20](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversationMemoryInterface.ts#L20)

Common type for all conversation memory manager implementations.
Provides a consistent API for storing, retrieving, and managing conversation history.

## Properties

### config

> **config**: [`ConversationMemoryConfig`](ConversationMemoryConfig.md)

Defined in: [types/conversationMemoryInterface.ts:21](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversationMemoryInterface.ts#L21)

## Methods

### initialize()

> **initialize**(): `void` \| `Promise`\<`void`\>

Defined in: [types/conversationMemoryInterface.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversationMemoryInterface.ts#L24)

Initialize the memory manager

#### Returns

`void` \| `Promise`\<`void`\>

---

### storeConversationTurn()

> **storeConversationTurn**(`options`): `Promise`\<`void`\>

Defined in: [types/conversationMemoryInterface.ts:27](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversationMemoryInterface.ts#L27)

Store a conversation turn

#### Parameters

##### options

[`StoreConversationTurnOptions`](StoreConversationTurnOptions.md)

#### Returns

`Promise`\<`void`\>

---

### getSession()

> **getSession**(`sessionId`, `userId?`): [`SessionMemory`](SessionMemory.md) \| `Promise`\<[`SessionMemory`](SessionMemory.md) \| `undefined`\> \| `undefined`

Defined in: [types/conversationMemoryInterface.ts:30](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversationMemoryInterface.ts#L30)

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

Defined in: [types/conversationMemoryInterface.ts:36](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversationMemoryInterface.ts#L36)

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

Defined in: [types/conversationMemoryInterface.ts:44](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversationMemoryInterface.ts#L44)

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

Defined in: [types/conversationMemoryInterface.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversationMemoryInterface.ts#L47)

Clear all sessions

#### Returns

`void` \| `Promise`\<`void`\>

---

### getStats()

> **getStats**(): [`ConversationMemoryStats`](ConversationMemoryStats.md) \| `Promise`\<[`ConversationMemoryStats`](ConversationMemoryStats.md)\>

Defined in: [types/conversationMemoryInterface.ts:50](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversationMemoryInterface.ts#L50)

Get memory statistics

#### Returns

[`ConversationMemoryStats`](ConversationMemoryStats.md) \| `Promise`\<[`ConversationMemoryStats`](ConversationMemoryStats.md)\>

---

### listSessions()?

#### Call Signature

> `optional` **listSessions**(`userId?`): `Promise`\<[`SessionListItem`](SessionListItem.md)[]\>

Defined in: [types/conversationMemoryInterface.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversationMemoryInterface.ts#L53)

List all sessions with metadata (optional - for session management)

##### Parameters

###### userId?

`string`

##### Returns

`Promise`\<[`SessionListItem`](SessionListItem.md)[]\>

#### Call Signature

> `optional` **listSessions**(`userId?`): `Promise`\<[`SessionListItem`](SessionListItem.md)[]\>

Defined in: [types/conversationMemoryInterface.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversationMemoryInterface.ts#L56)

List all sessions with metadata (optional - for session management)

##### Parameters

###### userId?

`string`

##### Returns

`Promise`\<[`SessionListItem`](SessionListItem.md)[]\>

---

### getSessionMessages()

> **getSessionMessages**(`sessionId`, `userId?`): `Promise`\<[`ChatMessage`](ChatMessage.md)[]\>

Defined in: [types/conversationMemoryInterface.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversationMemoryInterface.ts#L58)

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

Defined in: [types/conversationMemoryInterface.ts:64](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversationMemoryInterface.ts#L64)

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

### storeToolExecution()?

> `optional` **storeToolExecution**(`sessionId`, `userId`, `toolCalls`, `toolResults`, `currentTime?`): `Promise`\<`void`\>

Defined in: [types/conversationMemoryInterface.ts:80](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversationMemoryInterface.ts#L80)

Persist a step's tool calls and results as `tool_call` / `tool_result`
messages on the session.

Declared on the interface so every backend can implement it. Previously
only the Redis manager had it, and the caller reached it by casting — so
on in-memory storage tool activity never became messages at all, and the
compaction, pruning and pair-repair paths saw a different history shape
depending on `STORAGE_TYPE`.

#### Parameters

##### sessionId

`string`

##### userId

`string` \| `undefined`

##### toolCalls

`object`[]

##### toolResults

`object`[]

##### currentTime?

`Date`

#### Returns

`Promise`\<`void`\>

---

### close()?

> `optional` **close**(): `Promise`\<`void`\>

Defined in: [types/conversationMemoryInterface.ts:100](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversationMemoryInterface.ts#L100)

Close/shutdown the memory manager and release resources (e.g., Redis connections)

#### Returns

`Promise`\<`void`\>
