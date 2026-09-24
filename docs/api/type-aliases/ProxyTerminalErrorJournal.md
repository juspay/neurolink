[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorJournal

# Type Alias: ProxyTerminalErrorJournal

> **ProxyTerminalErrorJournal** = `object`

Defined in: [types/proxy.ts:1623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1623)

Bounded terminal-error state stored separately from counters and body logs.

## Properties

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:1624](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1624)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:1625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1625)

---

### counts

> **counts**: `Record`\<[`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md), `number`\>

Defined in: [types/proxy.ts:1626](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1626)

---

### recent

> **recent**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md)[]

Defined in: [types/proxy.ts:1627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1627)
