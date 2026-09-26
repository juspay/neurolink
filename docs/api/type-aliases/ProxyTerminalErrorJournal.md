[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorJournal

# Type Alias: ProxyTerminalErrorJournal

> **ProxyTerminalErrorJournal** = `object`

Defined in: [types/proxy.ts:1611](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1611)

Bounded terminal-error state stored separately from counters and body logs.

## Properties

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:1612](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1612)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:1613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1613)

---

### counts

> **counts**: `Record`\<[`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md), `number`\>

Defined in: [types/proxy.ts:1614](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1614)

---

### recent

> **recent**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md)[]

Defined in: [types/proxy.ts:1615](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1615)
