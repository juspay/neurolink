[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IConversationMemoryManager

# Type Alias: IConversationMemoryManager

> **IConversationMemoryManager** = `object`

Common type for all conversation memory manager implementations.
Provides a consistent API for storing, retrieving, and managing conversation history.

## Properties

### config

> **config**: [`ConversationMemoryConfig`](ConversationMemoryConfig.md)

## Methods

### initialize()

> **initialize**(): `void` \| `Promise`\<`void`\>

Initialize the memory manager

#### Returns

`void` \| `Promise`\<`void`\>

---

### storeConversationTurn()

> **storeConversationTurn**(`options`): `Promise`\<`void`\>

Store a conversation turn

#### Parameters

##### options

[`StoreConversationTurnOptions`](StoreConversationTurnOptions.md)

#### Returns

`Promise`\<`void`\>

---

### getSession()

> **getSession**(`sessionId`, `userId?`): [`SessionMemory`](SessionMemory.md) \| `Promise`\<[`SessionMemory`](SessionMemory.md) \| `undefined`\> \| `undefined`

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

Clear all sessions

#### Returns

`void` \| `Promise`\<`void`\>

---

### getStats()

> **getStats**(): [`ConversationMemoryStats`](ConversationMemoryStats.md) \| `Promise`\<[`ConversationMemoryStats`](ConversationMemoryStats.md)\>

Get memory statistics

#### Returns

[`ConversationMemoryStats`](ConversationMemoryStats.md) \| `Promise`\<[`ConversationMemoryStats`](ConversationMemoryStats.md)\>

---

### listSessions()?

#### Call Signature

> `optional` **listSessions**(`userId?`): `Promise`\<[`SessionListItem`](SessionListItem.md)[]\>

List all sessions with metadata (optional - for session management)

##### Parameters

###### userId?

`string`

##### Returns

`Promise`\<[`SessionListItem`](SessionListItem.md)[]\>

#### Call Signature

> `optional` **listSessions**(`userId?`): `Promise`\<[`SessionListItem`](SessionListItem.md)[]\>

List all sessions with metadata (optional - for session management)

##### Parameters

###### userId?

`string`

##### Returns

`Promise`\<[`SessionListItem`](SessionListItem.md)[]\>

---

### getSessionMessages()

> **getSessionMessages**(`sessionId`, `userId?`): `Promise`\<[`ChatMessage`](ChatMessage.md)[]\>

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

Close/shutdown the memory manager and release resources (e.g., Redis connections)

#### Returns

`Promise`\<`void`\>
