[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createSlidingWindowRateLimitMiddleware

# Function: createSlidingWindowRateLimitMiddleware()

> **createSlidingWindowRateLimitMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/rateLimit.ts:177](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/rateLimit.ts#L177)

Create a sliding window rate limiter
More accurate than fixed window but slightly more complex

## Parameters

### config

[`RateLimitMiddlewareConfig`](../type-aliases/RateLimitMiddlewareConfig.md) & `object`

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)
