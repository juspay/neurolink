[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createCacheMiddleware

# Function: createCacheMiddleware()

> **createCacheMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/cache.ts:107](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/cache.ts#L107)

Create cache middleware

Response headers set by this middleware:

- `X-Cache`: "HIT" if served from cache, "MISS" if freshly generated
- `X-Cache-Age`: Seconds since the response was cached (only on HIT)
- `Cache-Control`: Caching directive with max-age (only on MISS)

## Parameters

### config

[`ServerCacheConfig`](../type-aliases/ServerCacheConfig.md)

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

## Example

```typescript
const cacheMiddleware = createCacheMiddleware({
  ttlMs: 60 * 1000, // 1 minute
  methods: ["GET"],
  excludePaths: ["/api/health"],
});

server.registerMiddleware(cacheMiddleware);
```
