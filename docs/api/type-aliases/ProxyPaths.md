[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPaths

# Type Alias: ProxyPaths

> **ProxyPaths** = `object`

Defined in: [types/proxy.ts:2151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2151)

## Properties

### stateDir

> **stateDir**: `string`

Defined in: [types/proxy.ts:2153](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2153)

Base directory for proxy state files

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:2155](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2155)

logs/ — request/response logs

---

### quotaFile

> **quotaFile**: `string`

Defined in: [types/proxy.ts:2157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2157)

account-quotas.json — per-account rate limit state

---

### cooldownFile

> **cooldownFile**: `string`

Defined in: [types/proxy.ts:2159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2159)

account-cooldowns.json — restart-safe account cooldown state

---

### statsFile?

> `optional` **statsFile?**: `string`

Defined in: [types/proxy.ts:2161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2161)

proxy-usage-stats.json — restart- and handoff-safe usage counters

---

### grantsFile?

> `optional` **grantsFile?**: `string`

Defined in: [types/proxy.ts:2163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2163)

proxy-grants.json — grants this node has issued to borrowers

---

### ledgerFile?

> `optional` **ledgerFile?**: `string`

Defined in: [types/proxy.ts:2165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2165)

proxy-share-ledger.json — coin balances, holds and settled spend

---

### peersFile?

> `optional` **peersFile?**: `string`

Defined in: [types/proxy.ts:2167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2167)

proxy-peers.json — lenders this node may borrow from

---

### isDev

> **isDev**: `boolean`

Defined in: [types/proxy.ts:2169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2169)

Whether this is a dev-mode isolated instance
