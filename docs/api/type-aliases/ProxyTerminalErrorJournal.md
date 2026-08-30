[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorJournal

# Type Alias: ProxyTerminalErrorJournal

> **ProxyTerminalErrorJournal** = `object`

Defined in: [types/proxy.ts:1158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1158)

Bounded terminal-error state stored separately from counters and body logs.

## Properties

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:1159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1159)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:1160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1160)

---

### counts

> **counts**: `Record`\<[`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md), `number`\>

Defined in: [types/proxy.ts:1161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1161)

---

### recent

> **recent**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md)[]

Defined in: [types/proxy.ts:1162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1162)
