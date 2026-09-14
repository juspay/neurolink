[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPaths

# Type Alias: ProxyPaths

> **ProxyPaths** = `object`

Defined in: [types/proxy.ts:1883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1883)

## Properties

### stateDir

> **stateDir**: `string`

Defined in: [types/proxy.ts:1885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1885)

Base directory for proxy state files

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:1887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1887)

logs/ — request/response logs

---

### quotaFile

> **quotaFile**: `string`

Defined in: [types/proxy.ts:1889](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1889)

account-quotas.json — per-account rate limit state

---

### cooldownFile

> **cooldownFile**: `string`

Defined in: [types/proxy.ts:1891](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1891)

account-cooldowns.json — restart-safe account cooldown state

---

### statsFile?

> `optional` **statsFile?**: `string`

Defined in: [types/proxy.ts:1893](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1893)

proxy-usage-stats.json — restart- and handoff-safe usage counters

---

### grantsFile?

> `optional` **grantsFile?**: `string`

Defined in: [types/proxy.ts:1895](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1895)

proxy-grants.json — grants this node has issued to borrowers

---

### ledgerFile?

> `optional` **ledgerFile?**: `string`

Defined in: [types/proxy.ts:1897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1897)

proxy-share-ledger.json — coin balances, holds and settled spend

---

### peersFile?

> `optional` **peersFile?**: `string`

Defined in: [types/proxy.ts:1899](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1899)

proxy-peers.json — lenders this node may borrow from

---

### isDev

> **isDev**: `boolean`

Defined in: [types/proxy.ts:1901](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1901)

Whether this is a dev-mode isolated instance
