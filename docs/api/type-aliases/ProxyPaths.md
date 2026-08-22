[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPaths

# Type Alias: ProxyPaths

> **ProxyPaths** = `object`

Defined in: [types/proxy.ts:1586](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1586)

## Properties

### stateDir

> **stateDir**: `string`

Defined in: [types/proxy.ts:1588](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1588)

Base directory for proxy state files

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:1590](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1590)

logs/ — request/response logs

---

### quotaFile

> **quotaFile**: `string`

Defined in: [types/proxy.ts:1592](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1592)

account-quotas.json — per-account rate limit state

---

### cooldownFile

> **cooldownFile**: `string`

Defined in: [types/proxy.ts:1594](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1594)

account-cooldowns.json — restart-safe account cooldown state

---

### statsFile?

> `optional` **statsFile?**: `string`

Defined in: [types/proxy.ts:1596](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1596)

proxy-usage-stats.json — restart- and handoff-safe usage counters

---

### isDev

> **isDev**: `boolean`

Defined in: [types/proxy.ts:1598](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1598)

Whether this is a dev-mode isolated instance
