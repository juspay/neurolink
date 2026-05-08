[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeToolResultBlock

# Type Alias: ClaudeToolResultBlock

> **ClaudeToolResultBlock** = `object`

Defined in: [types/proxy.ts:69](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L69)

Tool-result block sent back by the caller.

## Properties

### type

> **type**: `"tool_result"`

Defined in: [types/proxy.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L70)

---

### tool_use_id

> **tool_use_id**: `string`

Defined in: [types/proxy.ts:71](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L71)

---

### content

> **content**: `string` \| [`ClaudeContentBlock`](ClaudeContentBlock.md)[]

Defined in: [types/proxy.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L72)
