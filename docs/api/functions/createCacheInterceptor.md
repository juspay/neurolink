[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createCacheInterceptor

# Function: createCacheInterceptor()

> **createCacheInterceptor**(`options`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:575](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/interceptors.ts#L575)

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
