[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPaths

# Type Alias: ProxyPaths

> **ProxyPaths** = `object`

Defined in: [types/proxy.ts:2039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2039)

## Properties

### stateDir

> **stateDir**: `string`

Defined in: [types/proxy.ts:2041](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2041)

Base directory for proxy state files

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:2043](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2043)

logs/ — request/response logs

---

### quotaFile

> **quotaFile**: `string`

Defined in: [types/proxy.ts:2045](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2045)

account-quotas.json — per-account rate limit state

---

### cooldownFile

> **cooldownFile**: `string`

Defined in: [types/proxy.ts:2047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2047)

account-cooldowns.json — restart-safe account cooldown state

---

### statsFile?

> `optional` **statsFile?**: `string`

Defined in: [types/proxy.ts:2049](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2049)

proxy-usage-stats.json — restart- and handoff-safe usage counters

---

### grantsFile?

> `optional` **grantsFile?**: `string`

Defined in: [types/proxy.ts:2051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2051)

proxy-grants.json — grants this node has issued to borrowers

---

### ledgerFile?

> `optional` **ledgerFile?**: `string`

Defined in: [types/proxy.ts:2053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2053)

proxy-share-ledger.json — coin balances, holds and settled spend

---

### peersFile?

> `optional` **peersFile?**: `string`

Defined in: [types/proxy.ts:2055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2055)

proxy-peers.json — lenders this node may borrow from

---

### isDev

> **isDev**: `boolean`

Defined in: [types/proxy.ts:2057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2057)

Whether this is a dev-mode isolated instance
