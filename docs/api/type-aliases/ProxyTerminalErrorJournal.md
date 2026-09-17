[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorJournal

# Type Alias: ProxyTerminalErrorJournal

> **ProxyTerminalErrorJournal** = `object`

Defined in: [types/proxy.ts:1374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1374)

Bounded terminal-error state stored separately from counters and body logs.

## Properties

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:1375](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1375)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:1376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1376)

---

### counts

> **counts**: `Record`\<[`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md), `number`\>

Defined in: [types/proxy.ts:1377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1377)

---

### recent

> **recent**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md)[]

Defined in: [types/proxy.ts:1378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1378)
