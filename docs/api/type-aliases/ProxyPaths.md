[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPaths

# Type Alias: ProxyPaths

> **ProxyPaths** = `object`

## Properties

### stateDir

> **stateDir**: `string`

Base directory for proxy state files

---

### logsDir

> **logsDir**: `string`

logs/ — request/response logs

---

### quotaFile

> **quotaFile**: `string`

account-quotas.json — per-account rate limit state

---

### cooldownFile

> **cooldownFile**: `string`

account-cooldowns.json — restart-safe account cooldown state

---

### statsFile?

> `optional` **statsFile?**: `string`

proxy-usage-stats.json — restart- and handoff-safe usage counters

---

### grantsFile?

> `optional` **grantsFile?**: `string`

proxy-grants.json — grants this node has issued to borrowers

---

### ledgerFile?

> `optional` **ledgerFile?**: `string`

proxy-share-ledger.json — coin balances, holds and settled spend

---

### peersFile?

> `optional` **peersFile?**: `string`

proxy-peers.json — lenders this node may borrow from

---

### isDev

> **isDev**: `boolean`

Whether this is a dev-mode isolated instance
