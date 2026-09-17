[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeAccountState

# Type Alias: RuntimeAccountState

> **RuntimeAccountState** = `object`

Defined in: [types/proxy.ts:1757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1757)

Runtime state for a proxy account.

## Properties

### consecutiveRefreshFailures

> **consecutiveRefreshFailures**: `number`

Defined in: [types/proxy.ts:1758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1758)

---

### permanentlyDisabled

> **permanentlyDisabled**: `boolean`

Defined in: [types/proxy.ts:1759](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1759)

---

### lastToken?

> `optional` **lastToken?**: `string`

Defined in: [types/proxy.ts:1760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1760)

---

### lastRefreshToken?

> `optional` **lastRefreshToken?**: `string`

Defined in: [types/proxy.ts:1761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1761)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1766](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1766)

Epoch-ms timestamp until which the account should not be used for new
requests. Set from the actual Anthropic reset/retry window or from
bounded refresh backoff. Other requests arriving during this window skip
the account rather than hammering it.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1768](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1768)

Why the account is cooling (set alongside coolingUntil).

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1772](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1772)

Latest quota snapshot parsed from Anthropic `anthropic-ratelimit-unified-*`
headers on ANY response (success or 429). Drives proactive, reset-aware
selection so we don't have to eat a 429 to discover an account is spent.
