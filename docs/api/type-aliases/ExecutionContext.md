[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExecutionContext

# Type Alias: ExecutionContext\<T\>

> **ExecutionContext**\<`T`\> = `object`

Generic execution context for MCP operations
Moved from src/lib/mcp/contracts/mcpContract.ts

## Type Parameters

### T

`T` = [`StandardRecord`](StandardRecord.md)

## Properties

### sessionId?

> `optional` **sessionId?**: `string`

---

### userId?

> `optional` **userId?**: `string`

---

### config?

> `optional` **config?**: `T`

---

### metadata?

> `optional` **metadata?**: [`StandardRecord`](StandardRecord.md)

---

### cacheOptions?

> `optional` **cacheOptions?**: [`CacheOptions`](CacheOptions.md)

---

### fallbackOptions?

> `optional` **fallbackOptions?**: [`FallbackOptions`](FallbackOptions.md)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

---

### maxRetries?

> `optional` **maxRetries?**: `number`

---

### startTime?

> `optional` **startTime?**: `number`

---

### hitlState?

> `optional` **hitlState?**: [`HITLExecutionState`](HITLExecutionState.md)
