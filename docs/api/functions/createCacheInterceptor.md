[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createCacheInterceptor

# Function: createCacheInterceptor()

> **createCacheInterceptor**(`options`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Caching interceptor

Caches responses to reduce API calls.

## Parameters

### options

[`CacheInterceptorOptions`](../type-aliases/CacheInterceptorOptions.md)

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
client.use(createCacheInterceptor({
  ttl: 60000, // 1 minute
  methods: ['GET'],
  includePaths: [//api/tools/, //api/providers/],
}));
```
