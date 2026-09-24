[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeAccountState

# Type Alias: RuntimeAccountState

> **RuntimeAccountState** = `object`

Defined in: [types/proxy.ts:1927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1927)

Runtime state for a proxy account.

## Properties

### consecutiveRefreshFailures

> **consecutiveRefreshFailures**: `number`

Defined in: [types/proxy.ts:1928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1928)

---

### permanentlyDisabled

> **permanentlyDisabled**: `boolean`

Defined in: [types/proxy.ts:1929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1929)

---

### lastToken?

> `optional` **lastToken?**: `string`

Defined in: [types/proxy.ts:1930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1930)

---

### lastRefreshToken?

> `optional` **lastRefreshToken?**: `string`

Defined in: [types/proxy.ts:1931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1931)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1936](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1936)

Epoch-ms timestamp until which the account should not be used for new
requests. Set from the actual Anthropic reset/retry window or from
bounded refresh backoff. Other requests arriving during this window skip
the account rather than hammering it.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1938](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1938)

Why the account is cooling (set alongside coolingUntil).

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1942)

Latest quota snapshot parsed from Anthropic `anthropic-ratelimit-unified-*`
headers on ANY response (success or 429). Drives proactive, reset-aware
selection so we don't have to eat a 429 to discover an account is spent.
