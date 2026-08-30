[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountCooldownPlan

# Type Alias: AccountCooldownPlan

> **AccountCooldownPlan** = `object`

Defined in: [types/proxy.ts:1025](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1025)

## Properties

### reason

> **reason**: [`RateLimitCoolingReason`](RateLimitCoolingReason.md)

Defined in: [types/proxy.ts:1026](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1026)

---

### coolingUntil

> **coolingUntil**: `number`

Defined in: [types/proxy.ts:1028](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1028)

Epoch-ms until which the account should not be used.

---

### rotateImmediately

> **rotateImmediately**: `boolean`

Defined in: [types/proxy.ts:1032](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1032)

When true (unified/5h/7d rejected), rotate immediately — retrying the
same account is futile until its window resets. When false (transient
burst), a small number of jittered same-account retries is allowed first.
