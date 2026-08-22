[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeAccountState

# Type Alias: RuntimeAccountState

> **RuntimeAccountState** = `object`

Defined in: [types/proxy.ts:1452](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1452)

Runtime state for a proxy account.

## Properties

### consecutiveRefreshFailures

> **consecutiveRefreshFailures**: `number`

Defined in: [types/proxy.ts:1453](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1453)

---

### permanentlyDisabled

> **permanentlyDisabled**: `boolean`

Defined in: [types/proxy.ts:1454](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1454)

---

### lastToken?

> `optional` **lastToken?**: `string`

Defined in: [types/proxy.ts:1455](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1455)

---

### lastRefreshToken?

> `optional` **lastRefreshToken?**: `string`

Defined in: [types/proxy.ts:1456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1456)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1461](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1461)

Epoch-ms timestamp until which the account should not be used for new
requests. Set from the actual Anthropic reset/retry window or from
bounded refresh backoff. Other requests arriving during this window skip
the account rather than hammering it.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1463](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1463)

Why the account is cooling (set alongside coolingUntil).

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1467](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1467)

Latest quota snapshot parsed from Anthropic `anthropic-ratelimit-unified-*`
headers on ANY response (success or 429). Drives proactive, reset-aware
selection so we don't have to eat a 429 to discover an account is spent.
