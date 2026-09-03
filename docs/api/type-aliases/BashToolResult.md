[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BashToolResult

# Type Alias: BashToolResult

> **BashToolResult** = `object`

Defined in: [types/tools.ts:676](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L676)

Result shape returned by the built-in `bashTool` execute function in
`src/lib/agent/directTools.ts`. Centralised here per CLAUDE.md rule 2
so callers (incl. the mcp-bash test suite) don't need to declare a
local re-shaping of the runtime contract.

## Properties

### success

> **success**: `boolean`

Defined in: [types/tools.ts:677](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L677)

---

### code

> **code**: `number`

Defined in: [types/tools.ts:678](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L678)

---

### stdout

> **stdout**: `string`

Defined in: [types/tools.ts:679](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L679)

---

### stderr

> **stderr**: `string`

Defined in: [types/tools.ts:680](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L680)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/tools.ts:681](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L681)
