[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createMemoryRoutes

# Function: createMemoryRoutes()

> **createMemoryRoutes**(`basePath?`): [`RouteGroup`](../type-aliases/RouteGroup.md)

Defined in: [server/routes/memoryRoutes.ts:521](https://github.com/juspay/neurolink/blob/release/src/lib/server/routes/memoryRoutes.ts#L521)

Create memory management routes
Note: These routes provide a simplified interface to conversation memory.
The actual implementation depends on the memory manager type (ConversationMemoryManager or RedisConversationMemoryManager).

## Parameters

### basePath?

`string` = `"/api"`

## Returns

[`RouteGroup`](../type-aliases/RouteGroup.md)
