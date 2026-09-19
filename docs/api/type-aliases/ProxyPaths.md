[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPaths

# Type Alias: ProxyPaths

> **ProxyPaths** = `object`

Defined in: [types/proxy.ts:1988](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1988)

## Properties

### stateDir

> **stateDir**: `string`

Defined in: [types/proxy.ts:1990](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1990)

Base directory for proxy state files

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:1992](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1992)

logs/ — request/response logs

---

### quotaFile

> **quotaFile**: `string`

Defined in: [types/proxy.ts:1994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1994)

account-quotas.json — per-account rate limit state

---

### cooldownFile

> **cooldownFile**: `string`

Defined in: [types/proxy.ts:1996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1996)

account-cooldowns.json — restart-safe account cooldown state

---

### statsFile?

> `optional` **statsFile?**: `string`

Defined in: [types/proxy.ts:1998](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1998)

proxy-usage-stats.json — restart- and handoff-safe usage counters

---

### grantsFile?

> `optional` **grantsFile?**: `string`

Defined in: [types/proxy.ts:2000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2000)

proxy-grants.json — grants this node has issued to borrowers

---

### ledgerFile?

> `optional` **ledgerFile?**: `string`

Defined in: [types/proxy.ts:2002](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2002)

proxy-share-ledger.json — coin balances, holds and settled spend

---

### peersFile?

> `optional` **peersFile?**: `string`

Defined in: [types/proxy.ts:2004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2004)

proxy-peers.json — lenders this node may borrow from

---

### isDev

> **isDev**: `boolean`

Defined in: [types/proxy.ts:2006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2006)

Whether this is a dev-mode isolated instance
