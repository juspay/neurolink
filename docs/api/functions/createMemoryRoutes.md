[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createMemoryRoutes

# Function: createMemoryRoutes()

> **createMemoryRoutes**(`basePath?`): [`RouteGroup`](../type-aliases/RouteGroup.md)

Defined in: [server/routes/memoryRoutes.ts:521](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/routes/memoryRoutes.ts#L521)

Create memory management routes
Note: These routes provide a simplified interface to conversation memory.
The actual implementation depends on the memory manager type (ConversationMemoryManager or RedisConversationMemoryManager).

## Parameters

### basePath?

`string` = `"/api"`

## Returns

[`RouteGroup`](../type-aliases/RouteGroup.md)
