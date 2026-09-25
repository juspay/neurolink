[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountCooldownPlan

# Type Alias: AccountCooldownPlan

> **AccountCooldownPlan** = `object`

Defined in: [types/proxy.ts:1467](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1467)

## Properties

### reason

> **reason**: [`RateLimitCoolingReason`](RateLimitCoolingReason.md)

Defined in: [types/proxy.ts:1468](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1468)

---

### scope

> **scope**: `"account"` \| `"model"`

Defined in: [types/proxy.ts:1474](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1474)

Whether this limit applies to every request on the account or only to the
requested model. Model scope must never be persisted as an account
cooldown; the quota window itself remains the routing evidence.

---

### coolingUntil

> **coolingUntil**: `number`

Defined in: [types/proxy.ts:1476](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1476)

Epoch-ms until which the limiting window is expected to recover.

---

### rotateImmediately

> **rotateImmediately**: `boolean`

Defined in: [types/proxy.ts:1480](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1480)

When true (unified/5h/7d rejected), rotate immediately — retrying the
same account is futile until its window resets. When false (transient
burst), a small number of jittered same-account retries is allowed first.
