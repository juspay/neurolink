[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createMemoryRoutes

# Function: createMemoryRoutes()

> **createMemoryRoutes**(`basePath?`): [`RouteGroup`](../type-aliases/RouteGroup.md)

Defined in: [server/routes/memoryRoutes.ts:521](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/routes/memoryRoutes.ts#L521)

Create memory management routes
Note: These routes provide a simplified interface to conversation memory.
The actual implementation depends on the memory manager type (ConversationMemoryManager or RedisConversationMemoryManager).

## Parameters

### basePath?

`string` = `"/api"`

## Returns

[`RouteGroup`](../type-aliases/RouteGroup.md)
