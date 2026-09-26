[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterStats

# Type Alias: RateLimiterStats

> **RateLimiterStats** = `object`

Rate limiter statistics for monitoring and debugging HTTP transport rate limiting
Provides insight into token bucket state and queue status

## Properties

### tokens

> **tokens**: `number`

Current number of available tokens

---

### maxBurst

> **maxBurst**: `number`

Maximum burst size (token capacity)

---

### refillRate

> **refillRate**: `number`

Token refill rate (tokens per second)

---

### queueLength

> **queueLength**: `number`

Number of requests waiting in queue

---

### lastRefill

> **lastRefill**: `Date`

Timestamp of last token refill
