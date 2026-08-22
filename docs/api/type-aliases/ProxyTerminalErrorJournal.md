[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorJournal

# Type Alias: ProxyTerminalErrorJournal

> **ProxyTerminalErrorJournal** = `object`

Defined in: [types/proxy.ts:1091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1091)

Bounded terminal-error state stored separately from counters and body logs.

## Properties

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:1092](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1092)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:1093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1093)

---

### counts

> **counts**: `Record`\<[`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md), `number`\>

Defined in: [types/proxy.ts:1094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1094)

---

### recent

> **recent**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md)[]

Defined in: [types/proxy.ts:1095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1095)
