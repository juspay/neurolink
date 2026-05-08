[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createRateLimitStorage

# Function: createRateLimitStorage()

> **createRateLimitStorage**(`config`): [`RateLimitStorage`](../type-aliases/RateLimitStorage.md)

Defined in: [auth/middleware/rateLimitByUser.ts:700](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L700)

Create rate limit storage based on configuration

## Parameters

### config

Storage configuration

#### type

`"memory"` \| `"redis"`

#### redis?

\{ `url`: `string`; `prefix?`: `string`; `ttlSeconds?`: `number`; `windowMs?`: `number`; \}

#### redis.url

`string`

#### redis.prefix?

`string`

#### redis.ttlSeconds?

`number`

#### redis.windowMs?

`number`

#### cleanupIntervalMs?

`number`

## Returns

[`RateLimitStorage`](../type-aliases/RateLimitStorage.md)

Appropriate storage backend

## Example

```typescript
// Memory storage (default)
const storage = createRateLimitStorage({ type: "memory" });

// Redis storage
const storage = createRateLimitStorage({
  type: "redis",
  redis: {
    url: "redis://localhost:6379",
    prefix: "myapp:ratelimit:",
  },
});
```
