[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitCoolingReason

# Type Alias: RateLimitCoolingReason

> **RateLimitCoolingReason** = `Exclude`\<[`AccountCoolingReason`](AccountCoolingReason.md), `"auth"`\>

Defined in: [types/proxy.ts:948](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L948)

How to cool an account after a genuine (non-anti-abuse) 429, derived from
the response's quota headers + retry-after.
