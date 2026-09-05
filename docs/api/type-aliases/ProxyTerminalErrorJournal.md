[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorJournal

# Type Alias: ProxyTerminalErrorJournal

> **ProxyTerminalErrorJournal** = `object`

Defined in: [types/proxy.ts:1178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1178)

Bounded terminal-error state stored separately from counters and body logs.

## Properties

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:1179](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1179)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:1180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1180)

---

### counts

> **counts**: `Record`\<[`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md), `number`\>

Defined in: [types/proxy.ts:1181](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1181)

---

### recent

> **recent**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md)[]

Defined in: [types/proxy.ts:1182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1182)
