[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPaths

# Type Alias: ProxyPaths

> **ProxyPaths** = `object`

Defined in: [types/proxy.ts:1691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1691)

## Properties

### stateDir

> **stateDir**: `string`

Defined in: [types/proxy.ts:1693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1693)

Base directory for proxy state files

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:1695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1695)

logs/ — request/response logs

---

### quotaFile

> **quotaFile**: `string`

Defined in: [types/proxy.ts:1697](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1697)

account-quotas.json — per-account rate limit state

---

### cooldownFile

> **cooldownFile**: `string`

Defined in: [types/proxy.ts:1699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1699)

account-cooldowns.json — restart-safe account cooldown state

---

### statsFile?

> `optional` **statsFile?**: `string`

Defined in: [types/proxy.ts:1701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1701)

proxy-usage-stats.json — restart- and handoff-safe usage counters

---

### grantsFile?

> `optional` **grantsFile?**: `string`

Defined in: [types/proxy.ts:1703](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1703)

proxy-grants.json — grants this node has issued to borrowers

---

### ledgerFile?

> `optional` **ledgerFile?**: `string`

Defined in: [types/proxy.ts:1705](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1705)

proxy-share-ledger.json — coin balances, holds and settled spend

---

### peersFile?

> `optional` **peersFile?**: `string`

Defined in: [types/proxy.ts:1707](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1707)

proxy-peers.json — lenders this node may borrow from

---

### isDev

> **isDev**: `boolean`

Defined in: [types/proxy.ts:1709](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1709)

Whether this is a dev-mode isolated instance
