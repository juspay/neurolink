[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BashToolResult

# Type Alias: BashToolResult

> **BashToolResult** = `object`

Defined in: [types/tools.ts:689](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L689)

Result shape returned by the built-in `bashTool` execute function in
`src/lib/agent/directTools.ts`. Centralised here per CLAUDE.md rule 2
so callers (incl. the mcp-bash test suite) don't need to declare a
local re-shaping of the runtime contract.

## Properties

### success

> **success**: `boolean`

Defined in: [types/tools.ts:690](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L690)

---

### code

> **code**: `number`

Defined in: [types/tools.ts:691](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L691)

---

### stdout

> **stdout**: `string`

Defined in: [types/tools.ts:692](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L692)

---

### stderr

> **stderr**: `string`

Defined in: [types/tools.ts:693](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L693)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/tools.ts:694](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L694)
