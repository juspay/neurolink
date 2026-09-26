[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BashToolResult

# Type Alias: BashToolResult

> **BashToolResult** = `object`

Result shape returned by the built-in `bashTool` execute function in
`src/lib/agent/directTools.ts`. Centralised here per CLAUDE.md rule 2
so callers (incl. the mcp-bash test suite) don't need to declare a
local re-shaping of the runtime contract.

## Properties

### success

> **success**: `boolean`

---

### code

> **code**: `number`

---

### stdout

> **stdout**: `string`

---

### stderr

> **stderr**: `string`

---

### error?

> `optional` **error?**: `string`
