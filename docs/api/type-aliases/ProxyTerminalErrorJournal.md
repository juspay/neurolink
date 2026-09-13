[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorJournal

# Type Alias: ProxyTerminalErrorJournal

> **ProxyTerminalErrorJournal** = `object`

Defined in: [types/proxy.ts:1268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1268)

Bounded terminal-error state stored separately from counters and body logs.

## Properties

### startedAt

> **startedAt**: `number`

Defined in: [types/proxy.ts:1269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1269)

---

### totalErrors

> **totalErrors**: `number`

Defined in: [types/proxy.ts:1270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1270)

---

### counts

> **counts**: `Record`\<[`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md), `number`\>

Defined in: [types/proxy.ts:1271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1271)

---

### recent

> **recent**: [`ProxyTerminalErrorSummary`](ProxyTerminalErrorSummary.md)[]

Defined in: [types/proxy.ts:1272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1272)
