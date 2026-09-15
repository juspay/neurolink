[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountCooldownPlan

# Type Alias: AccountCooldownPlan

> **AccountCooldownPlan** = `object`

Defined in: [types/proxy.ts:1230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1230)

## Properties

### reason

> **reason**: [`RateLimitCoolingReason`](RateLimitCoolingReason.md)

Defined in: [types/proxy.ts:1231](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1231)

---

### scope

> **scope**: `"account"` \| `"model"`

Defined in: [types/proxy.ts:1237](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1237)

Whether this limit applies to every request on the account or only to the
requested model. Model scope must never be persisted as an account
cooldown; the quota window itself remains the routing evidence.

---

### coolingUntil

> **coolingUntil**: `number`

Defined in: [types/proxy.ts:1239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1239)

Epoch-ms until which the limiting window is expected to recover.

---

### rotateImmediately

> **rotateImmediately**: `boolean`

Defined in: [types/proxy.ts:1243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1243)

When true (unified/5h/7d rejected), rotate immediately — retrying the
same account is futile until its window resets. When false (transient
burst), a small number of jittered same-account retries is allowed first.
