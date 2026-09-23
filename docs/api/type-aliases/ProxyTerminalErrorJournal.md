[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorJournal

# Type Alias: ProxyTerminalErrorJournal

> **ProxyTerminalErrorJournal** = `object`

Defined in: [types/proxy.ts:1541](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1541)

Bounded terminal-error state stored separately from counters and body logs.

## Properties

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:1542](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1542)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:1543](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1543)

---

### counts

> **counts**: `Record`\<[`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md), `number`\>

Defined in: [types/proxy.ts:1544](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1544)

---

### recent

> **recent**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md)[]

Defined in: [types/proxy.ts:1545](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1545)
