[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeAccountState

# Type Alias: RuntimeAccountState

> **RuntimeAccountState** = `object`

Defined in: [types/proxy.ts:1853](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1853)

Runtime state for a proxy account.

## Properties

### consecutiveRefreshFailures

> **consecutiveRefreshFailures**: `number`

Defined in: [types/proxy.ts:1854](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1854)

---

### permanentlyDisabled

> **permanentlyDisabled**: `boolean`

Defined in: [types/proxy.ts:1855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1855)

---

### lastToken?

> `optional` **lastToken?**: `string`

Defined in: [types/proxy.ts:1856](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1856)

---

### lastRefreshToken?

> `optional` **lastRefreshToken?**: `string`

Defined in: [types/proxy.ts:1857](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1857)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1862](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1862)

Epoch-ms timestamp until which the account should not be used for new
requests. Set from the actual Anthropic reset/retry window or from
bounded refresh backoff. Other requests arriving during this window skip
the account rather than hammering it.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1864](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1864)

Why the account is cooling (set alongside coolingUntil).

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1868](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1868)

Latest quota snapshot parsed from Anthropic `anthropic-ratelimit-unified-*`
headers on ANY response (success or 429). Drives proactive, reset-aware
selection so we don't have to eat a 429 to discover an account is spent.
