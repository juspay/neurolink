[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpCacheEntry

# Type Alias: McpCacheEntry\<T\>

> **McpCacheEntry**\<`T`\> = `object`

Cached entry held by ToolCache. Named McpCacheEntry to disambiguate from
the response-caching middleware's CacheEntry in server.ts (Rule 9).

## Type Parameters

### T

`T` = `unknown`

## Properties

### value

> **value**: `T`

---

### expires

> **expires**: `number`

---

### createdAt

> **createdAt**: `number`

---

### accessedAt

> **accessedAt**: `number`

---

### accessCount

> **accessCount**: `number`

---

### key

> **key**: `string`
