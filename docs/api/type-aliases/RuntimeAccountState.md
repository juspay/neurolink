[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeAccountState

# Type Alias: RuntimeAccountState

> **RuntimeAccountState** = `object`

Defined in: [types/proxy.ts:1541](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1541)

Runtime state for a proxy account.

## Properties

### consecutiveRefreshFailures

> **consecutiveRefreshFailures**: `number`

Defined in: [types/proxy.ts:1542](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1542)

---

### permanentlyDisabled

> **permanentlyDisabled**: `boolean`

Defined in: [types/proxy.ts:1543](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1543)

---

### lastToken?

> `optional` **lastToken?**: `string`

Defined in: [types/proxy.ts:1544](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1544)

---

### lastRefreshToken?

> `optional` **lastRefreshToken?**: `string`

Defined in: [types/proxy.ts:1545](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1545)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1550](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1550)

Epoch-ms timestamp until which the account should not be used for new
requests. Set from the actual Anthropic reset/retry window or from
bounded refresh backoff. Other requests arriving during this window skip
the account rather than hammering it.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1552](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1552)

Why the account is cooling (set alongside coolingUntil).

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1556](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1556)

Latest quota snapshot parsed from Anthropic `anthropic-ratelimit-unified-*`
headers on ANY response (success or 429). Drives proactive, reset-aware
selection so we don't have to eat a 429 to discover an account is spent.
