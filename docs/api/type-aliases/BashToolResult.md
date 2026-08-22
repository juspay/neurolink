[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BashToolResult

# Type Alias: BashToolResult

> **BashToolResult** = `object`

Defined in: [types/tools.ts:642](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L642)

Result shape returned by the built-in `bashTool` execute function in
`src/lib/agent/directTools.ts`. Centralised here per CLAUDE.md rule 2
so callers (incl. the mcp-bash test suite) don't need to declare a
local re-shaping of the runtime contract.

## Properties

### success

> **success**: `boolean`

Defined in: [types/tools.ts:643](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L643)

---

### code

> **code**: `number`

Defined in: [types/tools.ts:644](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L644)

---

### stdout

> **stdout**: `string`

Defined in: [types/tools.ts:645](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L645)

---

### stderr

> **stderr**: `string`

Defined in: [types/tools.ts:646](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L646)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/tools.ts:647](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L647)
