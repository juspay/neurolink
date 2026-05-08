[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createCacheInterceptor

# Function: createCacheInterceptor()

> **createCacheInterceptor**(`options`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/interceptors.ts:575](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/interceptors.ts#L575)

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
