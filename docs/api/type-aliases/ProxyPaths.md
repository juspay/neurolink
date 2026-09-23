[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPaths

# Type Alias: ProxyPaths

> **ProxyPaths** = `object`

Defined in: [types/proxy.ts:2059](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2059)

## Properties

### stateDir

> **stateDir**: `string`

Defined in: [types/proxy.ts:2061](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2061)

Base directory for proxy state files

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:2063](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2063)

logs/ — request/response logs

---

### quotaFile

> **quotaFile**: `string`

Defined in: [types/proxy.ts:2065](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2065)

account-quotas.json — per-account rate limit state

---

### cooldownFile

> **cooldownFile**: `string`

Defined in: [types/proxy.ts:2067](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2067)

account-cooldowns.json — restart-safe account cooldown state

---

### statsFile?

> `optional` **statsFile?**: `string`

Defined in: [types/proxy.ts:2069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2069)

proxy-usage-stats.json — restart- and handoff-safe usage counters

---

### grantsFile?

> `optional` **grantsFile?**: `string`

Defined in: [types/proxy.ts:2071](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2071)

proxy-grants.json — grants this node has issued to borrowers

---

### ledgerFile?

> `optional` **ledgerFile?**: `string`

Defined in: [types/proxy.ts:2073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2073)

proxy-share-ledger.json — coin balances, holds and settled spend

---

### peersFile?

> `optional` **peersFile?**: `string`

Defined in: [types/proxy.ts:2075](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2075)

proxy-peers.json — lenders this node may borrow from

---

### isDev

> **isDev**: `boolean`

Defined in: [types/proxy.ts:2077](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2077)

Whether this is a dev-mode isolated instance
