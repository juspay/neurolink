[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeAccountState

# Type Alias: RuntimeAccountState

> **RuntimeAccountState** = `object`

Defined in: [types/proxy.ts:1772](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1772)

Runtime state for a proxy account.

## Properties

### consecutiveRefreshFailures

> **consecutiveRefreshFailures**: `number`

Defined in: [types/proxy.ts:1773](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1773)

---

### permanentlyDisabled

> **permanentlyDisabled**: `boolean`

Defined in: [types/proxy.ts:1774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1774)

---

### lastToken?

> `optional` **lastToken?**: `string`

Defined in: [types/proxy.ts:1775](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1775)

---

### lastRefreshToken?

> `optional` **lastRefreshToken?**: `string`

Defined in: [types/proxy.ts:1776](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1776)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1781](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1781)

Epoch-ms timestamp until which the account should not be used for new
requests. Set from the actual Anthropic reset/retry window or from
bounded refresh backoff. Other requests arriving during this window skip
the account rather than hammering it.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1783](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1783)

Why the account is cooling (set alongside coolingUntil).

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1787](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1787)

Latest quota snapshot parsed from Anthropic `anthropic-ratelimit-unified-*`
headers on ANY response (success or 429). Drives proactive, reset-aware
selection so we don't have to eat a 429 to discover an account is spent.
