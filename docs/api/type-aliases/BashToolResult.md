[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BashToolResult

# Type Alias: BashToolResult

> **BashToolResult** = `object`

Defined in: [types/tools.ts:653](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L653)

Result shape returned by the built-in `bashTool` execute function in
`src/lib/agent/directTools.ts`. Centralised here per CLAUDE.md rule 2
so callers (incl. the mcp-bash test suite) don't need to declare a
local re-shaping of the runtime contract.

## Properties

### success

> **success**: `boolean`

Defined in: [types/tools.ts:654](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L654)

---

### code

> **code**: `number`

Defined in: [types/tools.ts:655](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L655)

---

### stdout

> **stdout**: `string`

Defined in: [types/tools.ts:656](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L656)

---

### stderr

> **stderr**: `string`

Defined in: [types/tools.ts:657](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L657)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/tools.ts:658](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L658)
