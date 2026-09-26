[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorJournal

# Type Alias: ProxyTerminalErrorJournal

> **ProxyTerminalErrorJournal** = `object`

Defined in: [types/proxy.ts:1633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1633)

Bounded terminal-error state stored separately from counters and body logs.

## Properties

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:1634](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1634)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:1635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1635)

---

### counts

> **counts**: `Record`\<[`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md), `number`\>

Defined in: [types/proxy.ts:1636](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1636)

---

### recent

> **recent**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md)[]

Defined in: [types/proxy.ts:1637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1637)
