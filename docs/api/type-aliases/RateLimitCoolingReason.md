[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitCoolingReason

# Type Alias: RateLimitCoolingReason

> **RateLimitCoolingReason** = `Exclude`\<[`AccountCoolingReason`](AccountCoolingReason.md), `"auth"`\>

How to cool an account after a genuine (non-anti-abuse) 429, derived from
the response's quota headers + retry-after.
