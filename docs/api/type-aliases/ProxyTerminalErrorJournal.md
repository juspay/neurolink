[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorJournal

# Type Alias: ProxyTerminalErrorJournal

> **ProxyTerminalErrorJournal** = `object`

Defined in: [types/proxy.ts:1173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1173)

Bounded terminal-error state stored separately from counters and body logs.

## Properties

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:1174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1174)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:1175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1175)

---

### counts

> **counts**: `Record`\<[`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md), `number`\>

Defined in: [types/proxy.ts:1176](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1176)

---

### recent

> **recent**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md)[]

Defined in: [types/proxy.ts:1177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1177)
