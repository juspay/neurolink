[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorJournal

# Type Alias: ProxyTerminalErrorJournal

> **ProxyTerminalErrorJournal** = `object`

Defined in: [types/proxy.ts:1544](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1544)

Bounded terminal-error state stored separately from counters and body logs.

## Properties

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:1545](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1545)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:1546](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1546)

---

### counts

> **counts**: `Record`\<[`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md), `number`\>

Defined in: [types/proxy.ts:1547](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1547)

---

### recent

> **recent**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md)[]

Defined in: [types/proxy.ts:1548](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1548)
