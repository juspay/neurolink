[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorJournal

# Type Alias: ProxyTerminalErrorJournal

> **ProxyTerminalErrorJournal** = `object`

Defined in: [types/proxy.ts:1167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1167)

Bounded terminal-error state stored separately from counters and body logs.

## Properties

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:1168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1168)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:1169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1169)

---

### counts

> **counts**: `Record`\<[`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md), `number`\>

Defined in: [types/proxy.ts:1170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1170)

---

### recent

> **recent**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md)[]

Defined in: [types/proxy.ts:1171](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1171)
