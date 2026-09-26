[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolNameResolution

# Type Alias: ToolNameResolution

> **ToolNameResolution** = `object`

Outcome of matching a possibly-misspelled tool name against a list of
available tool names (see `resolveToolName` in
src/lib/utils/toolCallRepair.ts). Shared between the AI-SDK generation-path
repair (`experimental_repairToolCall`) and direct MCP execution boundaries
(`NeuroLink.executeExternalMCPTool`) so both recover from the same class of
near-miss the same way.

## Properties

### name

> **name**: `string`

The resolved, available tool name.

---

### strategy

> **strategy**: `"case"` \| `"substring"` \| `"levenshtein"`

Which strategy produced the match, in the order they are attempted.

---

### score?

> `optional` **score?**: `number`

Normalized Levenshtein distance (0–1) — only set when strategy is "levenshtein".
