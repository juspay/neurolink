[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountCooldownPlan

# Type Alias: AccountCooldownPlan

> **AccountCooldownPlan** = `object`

Defined in: [types/proxy.ts:968](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L968)

## Properties

### reason

> **reason**: [`RateLimitCoolingReason`](RateLimitCoolingReason.md)

Defined in: [types/proxy.ts:969](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L969)

---

### coolingUntil

> **coolingUntil**: `number`

Defined in: [types/proxy.ts:971](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L971)

Epoch-ms until which the account should not be used.

---

### rotateImmediately

> **rotateImmediately**: `boolean`

Defined in: [types/proxy.ts:975](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L975)

When true (unified/5h/7d rejected), rotate immediately — retrying the
same account is futile until its window resets. When false (transient
burst), a small number of jittered same-account retries is allowed first.
