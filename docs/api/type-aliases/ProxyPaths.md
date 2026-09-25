[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPaths

# Type Alias: ProxyPaths

> **ProxyPaths** = `object`

Defined in: [types/proxy.ts:2127](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2127)

## Properties

### stateDir

> **stateDir**: `string`

Defined in: [types/proxy.ts:2129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2129)

Base directory for proxy state files

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:2131](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2131)

logs/ — request/response logs

---

### quotaFile

> **quotaFile**: `string`

Defined in: [types/proxy.ts:2133](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2133)

account-quotas.json — per-account rate limit state

---

### cooldownFile

> **cooldownFile**: `string`

Defined in: [types/proxy.ts:2135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2135)

account-cooldowns.json — restart-safe account cooldown state

---

### statsFile?

> `optional` **statsFile?**: `string`

Defined in: [types/proxy.ts:2137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2137)

proxy-usage-stats.json — restart- and handoff-safe usage counters

---

### grantsFile?

> `optional` **grantsFile?**: `string`

Defined in: [types/proxy.ts:2139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2139)

proxy-grants.json — grants this node has issued to borrowers

---

### ledgerFile?

> `optional` **ledgerFile?**: `string`

Defined in: [types/proxy.ts:2141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2141)

proxy-share-ledger.json — coin balances, holds and settled spend

---

### peersFile?

> `optional` **peersFile?**: `string`

Defined in: [types/proxy.ts:2143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2143)

proxy-peers.json — lenders this node may borrow from

---

### isDev

> **isDev**: `boolean`

Defined in: [types/proxy.ts:2145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2145)

Whether this is a dev-mode isolated instance
