[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createSlidingWindowRateLimitMiddleware

# Function: createSlidingWindowRateLimitMiddleware()

> **createSlidingWindowRateLimitMiddleware**(`config`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Defined in: [server/middleware/rateLimit.ts:172](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/middleware/rateLimit.ts#L172)

Create a sliding window rate limiter
More accurate than fixed window but slightly more complex

## Parameters

### config

[`RateLimitMiddlewareConfig`](../type-aliases/RateLimitMiddlewareConfig.md) & `object`

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)
