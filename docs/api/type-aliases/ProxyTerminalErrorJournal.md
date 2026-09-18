[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorJournal

# Type Alias: ProxyTerminalErrorJournal

> **ProxyTerminalErrorJournal** = `object`

Defined in: [types/proxy.ts:1389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1389)

Bounded terminal-error state stored separately from counters and body logs.

## Properties

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:1390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1390)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:1391](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1391)

---

### counts

> **counts**: `Record`\<[`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md), `number`\>

Defined in: [types/proxy.ts:1392](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1392)

---

### recent

> **recent**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md)[]

Defined in: [types/proxy.ts:1393](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1393)
