[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPaths

# Type Alias: ProxyPaths

> **ProxyPaths** = `object`

Defined in: [types/proxy.ts:1690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1690)

## Properties

### stateDir

> **stateDir**: `string`

Defined in: [types/proxy.ts:1692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1692)

Base directory for proxy state files

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:1694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1694)

logs/ — request/response logs

---

### quotaFile

> **quotaFile**: `string`

Defined in: [types/proxy.ts:1696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1696)

account-quotas.json — per-account rate limit state

---

### cooldownFile

> **cooldownFile**: `string`

Defined in: [types/proxy.ts:1698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1698)

account-cooldowns.json — restart-safe account cooldown state

---

### statsFile?

> `optional` **statsFile?**: `string`

Defined in: [types/proxy.ts:1700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1700)

proxy-usage-stats.json — restart- and handoff-safe usage counters

---

### grantsFile?

> `optional` **grantsFile?**: `string`

Defined in: [types/proxy.ts:1702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1702)

proxy-grants.json — grants this node has issued to borrowers

---

### ledgerFile?

> `optional` **ledgerFile?**: `string`

Defined in: [types/proxy.ts:1704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1704)

proxy-share-ledger.json — coin balances, holds and settled spend

---

### peersFile?

> `optional` **peersFile?**: `string`

Defined in: [types/proxy.ts:1706](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1706)

proxy-peers.json — lenders this node may borrow from

---

### isDev

> **isDev**: `boolean`

Defined in: [types/proxy.ts:1708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1708)

Whether this is a dev-mode isolated instance
