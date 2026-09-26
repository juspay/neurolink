[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GeminiToolExecutionGuards

# ~~Type Alias: GeminiToolExecutionGuards~~

> **GeminiToolExecutionGuards** = [`ToolExecutionGuards`](ToolExecutionGuards.md)

## Deprecated

Renamed to `ToolExecutionGuards` — the guards were never
Gemini-specific. Kept because this name is re-exported from the package root
via the types barrel, so removing it outright would break any consumer that
imports it (CLAUDE.md rule 5). Safe to drop at the next major.
