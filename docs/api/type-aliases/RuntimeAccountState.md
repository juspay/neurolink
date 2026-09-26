[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeAccountState

# Type Alias: RuntimeAccountState

> **RuntimeAccountState** = `object`

Defined in: [types/proxy.ts:2016](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2016)

Runtime state for a proxy account.

## Properties

### consecutiveRefreshFailures

> **consecutiveRefreshFailures**: `number`

Defined in: [types/proxy.ts:2017](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2017)

---

### permanentlyDisabled

> **permanentlyDisabled**: `boolean`

Defined in: [types/proxy.ts:2018](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2018)

---

### lastToken?

> `optional` **lastToken?**: `string`

Defined in: [types/proxy.ts:2019](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2019)

---

### lastRefreshToken?

> `optional` **lastRefreshToken?**: `string`

Defined in: [types/proxy.ts:2020](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2020)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:2025](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2025)

Epoch-ms timestamp until which the account should not be used for new
requests. Set from the actual Anthropic reset/retry window or from
bounded refresh backoff. Other requests arriving during this window skip
the account rather than hammering it.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:2027](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2027)

Why the account is cooling (set alongside coolingUntil).

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:2031](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2031)

Latest quota snapshot parsed from Anthropic `anthropic-ratelimit-unified-*`
headers on ANY response (success or 429). Drives proactive, reset-aware
selection so we don't have to eat a 429 to discover an account is spent.
