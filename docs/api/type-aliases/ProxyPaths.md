[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPaths

# Type Alias: ProxyPaths

> **ProxyPaths** = `object`

Defined in: [types/proxy.ts:2062](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2062)

## Properties

### stateDir

> **stateDir**: `string`

Defined in: [types/proxy.ts:2064](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2064)

Base directory for proxy state files

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:2066](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2066)

logs/ — request/response logs

---

### quotaFile

> **quotaFile**: `string`

Defined in: [types/proxy.ts:2068](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2068)

account-quotas.json — per-account rate limit state

---

### cooldownFile

> **cooldownFile**: `string`

Defined in: [types/proxy.ts:2070](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2070)

account-cooldowns.json — restart-safe account cooldown state

---

### statsFile?

> `optional` **statsFile?**: `string`

Defined in: [types/proxy.ts:2072](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2072)

proxy-usage-stats.json — restart- and handoff-safe usage counters

---

### grantsFile?

> `optional` **grantsFile?**: `string`

Defined in: [types/proxy.ts:2074](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2074)

proxy-grants.json — grants this node has issued to borrowers

---

### ledgerFile?

> `optional` **ledgerFile?**: `string`

Defined in: [types/proxy.ts:2076](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2076)

proxy-share-ledger.json — coin balances, holds and settled spend

---

### peersFile?

> `optional` **peersFile?**: `string`

Defined in: [types/proxy.ts:2078](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2078)

proxy-peers.json — lenders this node may borrow from

---

### isDev

> **isDev**: `boolean`

Defined in: [types/proxy.ts:2080](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2080)

Whether this is a dev-mode isolated instance
