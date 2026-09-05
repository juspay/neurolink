[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RuntimeAccountState

# Type Alias: RuntimeAccountState

> **RuntimeAccountState** = `object`

Defined in: [types/proxy.ts:1561](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1561)

Runtime state for a proxy account.

## Properties

### consecutiveRefreshFailures

> **consecutiveRefreshFailures**: `number`

Defined in: [types/proxy.ts:1562](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1562)

---

### permanentlyDisabled

> **permanentlyDisabled**: `boolean`

Defined in: [types/proxy.ts:1563](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1563)

---

### lastToken?

> `optional` **lastToken?**: `string`

Defined in: [types/proxy.ts:1564](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1564)

---

### lastRefreshToken?

> `optional` **lastRefreshToken?**: `string`

Defined in: [types/proxy.ts:1565](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1565)

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1570)

Epoch-ms timestamp until which the account should not be used for new
requests. Set from the actual Anthropic reset/retry window or from
bounded refresh backoff. Other requests arriving during this window skip
the account rather than hammering it.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1572)

Why the account is cooling (set alongside coolingUntil).

---

### quota?

> `optional` **quota?**: [`AccountQuota`](AccountQuota.md)

Defined in: [types/proxy.ts:1576](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1576)

Latest quota snapshot parsed from Anthropic `anthropic-ratelimit-unified-*`
headers on ANY response (success or 429). Drives proactive, reset-aware
selection so we don't have to eat a 429 to discover an account is spent.
