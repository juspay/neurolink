[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPaths

# Type Alias: ProxyPaths

> **ProxyPaths** = `object`

Defined in: [types/proxy.ts:1696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1696)

## Properties

### stateDir

> **stateDir**: `string`

Defined in: [types/proxy.ts:1698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1698)

Base directory for proxy state files

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:1700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1700)

logs/ — request/response logs

---

### quotaFile

> **quotaFile**: `string`

Defined in: [types/proxy.ts:1702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1702)

account-quotas.json — per-account rate limit state

---

### cooldownFile

> **cooldownFile**: `string`

Defined in: [types/proxy.ts:1704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1704)

account-cooldowns.json — restart-safe account cooldown state

---

### statsFile?

> `optional` **statsFile?**: `string`

Defined in: [types/proxy.ts:1706](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1706)

proxy-usage-stats.json — restart- and handoff-safe usage counters

---

### grantsFile?

> `optional` **grantsFile?**: `string`

Defined in: [types/proxy.ts:1708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1708)

proxy-grants.json — grants this node has issued to borrowers

---

### ledgerFile?

> `optional` **ledgerFile?**: `string`

Defined in: [types/proxy.ts:1710](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1710)

proxy-share-ledger.json — coin balances, holds and settled spend

---

### peersFile?

> `optional` **peersFile?**: `string`

Defined in: [types/proxy.ts:1712](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1712)

proxy-peers.json — lenders this node may borrow from

---

### isDev

> **isDev**: `boolean`

Defined in: [types/proxy.ts:1714](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1714)

Whether this is a dev-mode isolated instance
