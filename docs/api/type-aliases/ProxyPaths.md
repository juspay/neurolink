[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPaths

# Type Alias: ProxyPaths

> **ProxyPaths** = `object`

Defined in: [types/proxy.ts:1675](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1675)

## Properties

### stateDir

> **stateDir**: `string`

Defined in: [types/proxy.ts:1677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1677)

Base directory for proxy state files

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:1679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1679)

logs/ — request/response logs

---

### quotaFile

> **quotaFile**: `string`

Defined in: [types/proxy.ts:1681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1681)

account-quotas.json — per-account rate limit state

---

### cooldownFile

> **cooldownFile**: `string`

Defined in: [types/proxy.ts:1683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1683)

account-cooldowns.json — restart-safe account cooldown state

---

### statsFile?

> `optional` **statsFile?**: `string`

Defined in: [types/proxy.ts:1685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1685)

proxy-usage-stats.json — restart- and handoff-safe usage counters

---

### grantsFile?

> `optional` **grantsFile?**: `string`

Defined in: [types/proxy.ts:1687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1687)

proxy-grants.json — grants this node has issued to borrowers

---

### ledgerFile?

> `optional` **ledgerFile?**: `string`

Defined in: [types/proxy.ts:1689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1689)

proxy-share-ledger.json — coin balances, holds and settled spend

---

### peersFile?

> `optional` **peersFile?**: `string`

Defined in: [types/proxy.ts:1691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1691)

proxy-peers.json — lenders this node may borrow from

---

### isDev

> **isDev**: `boolean`

Defined in: [types/proxy.ts:1693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1693)

Whether this is a dev-mode isolated instance
