[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeAccountState

# Type Alias: RuntimeAccountState

> **RuntimeAccountState** = `object`

Defined in: [types/proxy.ts:1992](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1992)

Runtime state for a proxy account.

## Properties

### consecutiveRefreshFailures

> **consecutiveRefreshFailures**: `number`

Defined in: [types/proxy.ts:1993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1993)

---

### permanentlyDisabled

> **permanentlyDisabled**: `boolean`

Defined in: [types/proxy.ts:1994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1994)

---

### lastToken?

> `optional` **lastToken?**: `string`

Defined in: [types/proxy.ts:1995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1995)

---

### lastRefreshToken?

> `optional` **lastRefreshToken?**: `string`

Defined in: [types/proxy.ts:1996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1996)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:2001](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2001)

Epoch-ms timestamp until which the account should not be used for new
requests. Set from the actual Anthropic reset/retry window or from
bounded refresh backoff. Other requests arriving during this window skip
the account rather than hammering it.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:2003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2003)

Why the account is cooling (set alongside coolingUntil).

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:2007](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2007)

Latest quota snapshot parsed from Anthropic `anthropic-ratelimit-unified-*`
headers on ANY response (success or 429). Drives proactive, reset-aware
selection so we don't have to eat a 429 to discover an account is spent.
