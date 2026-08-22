[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createSlidingWindowRateLimitMiddleware

# Function: createSlidingWindowRateLimitMiddleware()

> **createSlidingWindowRateLimitMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/rateLimit.ts:172](https://github.com/juspay/neurolink/blob/release/src/lib/server/middleware/rateLimit.ts#L172)

Create a sliding window rate limiter
More accurate than fixed window but slightly more complex

## Parameters

### config

[`RateLimitMiddlewareConfig`](../type-aliases/RateLimitMiddlewareConfig.md) & `object`

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)
