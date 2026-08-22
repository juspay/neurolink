[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitCoolingReason

# Type Alias: RateLimitCoolingReason

> **RateLimitCoolingReason** = `Exclude`\<[`AccountCoolingReason`](AccountCoolingReason.md), `"auth"`\>

Defined in: [types/proxy.ts:966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L966)

How to cool an account after a genuine (non-anti-abuse) 429, derived from
the response's quota headers + retry-after.
