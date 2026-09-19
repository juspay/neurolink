[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorJournal

# Type Alias: ProxyTerminalErrorJournal

> **ProxyTerminalErrorJournal** = `object`

Defined in: [types/proxy.ts:1470](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1470)

Bounded terminal-error state stored separately from counters and body logs.

## Properties

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:1471](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1471)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:1472](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1472)

---

### counts

> **counts**: `Record`\<[`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md), `number`\>

Defined in: [types/proxy.ts:1473](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1473)

---

### recent

> **recent**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md)[]

Defined in: [types/proxy.ts:1474](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1474)
