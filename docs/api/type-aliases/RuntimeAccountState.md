[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeAccountState

# Type Alias: RuntimeAccountState

> **RuntimeAccountState** = `object`

Defined in: [types/proxy.ts:1556](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1556)

Runtime state for a proxy account.

## Properties

### consecutiveRefreshFailures

> **consecutiveRefreshFailures**: `number`

Defined in: [types/proxy.ts:1557](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1557)

---

### permanentlyDisabled

> **permanentlyDisabled**: `boolean`

Defined in: [types/proxy.ts:1558](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1558)

---

### lastToken?

> `optional` **lastToken?**: `string`

Defined in: [types/proxy.ts:1559](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1559)

---

### lastRefreshToken?

> `optional` **lastRefreshToken?**: `string`

Defined in: [types/proxy.ts:1560](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1560)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1565](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1565)

Epoch-ms timestamp until which the account should not be used for new
requests. Set from the actual Anthropic reset/retry window or from
bounded refresh backoff. Other requests arriving during this window skip
the account rather than hammering it.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1567)

Why the account is cooling (set alongside coolingUntil).

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1571)

Latest quota snapshot parsed from Anthropic `anthropic-ratelimit-unified-*`
headers on ANY response (success or 429). Drives proactive, reset-aware
selection so we don't have to eat a 429 to discover an account is spent.
