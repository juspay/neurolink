[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPaths

# Type Alias: ProxyPaths

> **ProxyPaths** = `object`

Defined in: [types/proxy.ts:1907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1907)

## Properties

### stateDir

> **stateDir**: `string`

Defined in: [types/proxy.ts:1909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1909)

Base directory for proxy state files

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:1911](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1911)

logs/ — request/response logs

---

### quotaFile

> **quotaFile**: `string`

Defined in: [types/proxy.ts:1913](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1913)

account-quotas.json — per-account rate limit state

---

### cooldownFile

> **cooldownFile**: `string`

Defined in: [types/proxy.ts:1915](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1915)

account-cooldowns.json — restart-safe account cooldown state

---

### statsFile?

> `optional` **statsFile?**: `string`

Defined in: [types/proxy.ts:1917](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1917)

proxy-usage-stats.json — restart- and handoff-safe usage counters

---

### grantsFile?

> `optional` **grantsFile?**: `string`

Defined in: [types/proxy.ts:1919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1919)

proxy-grants.json — grants this node has issued to borrowers

---

### ledgerFile?

> `optional` **ledgerFile?**: `string`

Defined in: [types/proxy.ts:1921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1921)

proxy-share-ledger.json — coin balances, holds and settled spend

---

### peersFile?

> `optional` **peersFile?**: `string`

Defined in: [types/proxy.ts:1923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1923)

proxy-peers.json — lenders this node may borrow from

---

### isDev

> **isDev**: `boolean`

Defined in: [types/proxy.ts:1925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1925)

Whether this is a dev-mode isolated instance
