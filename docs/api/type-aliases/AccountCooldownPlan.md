[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountCooldownPlan

# Type Alias: AccountCooldownPlan

> **AccountCooldownPlan** = `object`

## Properties

### reason

> **reason**: [`RateLimitCoolingReason`](RateLimitCoolingReason.md)

---

### scope

> **scope**: `"account"` \| `"model"`

Whether this limit applies to every request on the account or only to the
requested model. Model scope must never be persisted as an account
cooldown; the quota window itself remains the routing evidence.

---

### coolingUntil

> **coolingUntil**: `number`

Epoch-ms until which the limiting window is expected to recover.

---

### rotateImmediately

> **rotateImmediately**: `boolean`

When true (unified/5h/7d rejected), rotate immediately — retrying the
same account is futile until its window resets. When false (transient
burst), a small number of jittered same-account retries is allowed first.
