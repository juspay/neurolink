[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolNameResolution

# Type Alias: ToolNameResolution

> **ToolNameResolution** = `object`

Defined in: [types/mcp.ts:602](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L602)

Outcome of matching a possibly-misspelled tool name against a list of
available tool names (see `resolveToolName` in
src/lib/utils/toolCallRepair.ts). Shared between the AI-SDK generation-path
repair (`experimental_repairToolCall`) and direct MCP execution boundaries
(`NeuroLink.executeExternalMCPTool`) so both recover from the same class of
near-miss the same way.

## Properties

### name

> **name**: `string`

Defined in: [types/mcp.ts:604](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L604)

The resolved, available tool name.

---

### strategy

> **strategy**: `"case"` \| `"substring"` \| `"levenshtein"`

Defined in: [types/mcp.ts:607](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L607)

Which strategy produced the match, in the order they are attempted.

---

### score?

> `optional` **score?**: `number`

Defined in: [types/mcp.ts:610](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L610)

Normalized Levenshtein distance (0–1) — only set when strategy is "levenshtein".
