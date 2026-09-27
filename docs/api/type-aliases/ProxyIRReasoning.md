[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyIRReasoning

# Type Alias: ProxyIRReasoning

> **ProxyIRReasoning** = \{ `source`: `"none"`; \} \| \{ `source`: `"anthropic_thinking"`; `type`: `string`; `budgetTokens?`: `number`; \} \| \{ `source`: `"codex_effort"`; `effort`: [`CodexReasoningEffort`](CodexReasoningEffort.md); \}

Reasoning configuration, tagged by the dialect that expressed it.

Anthropic budgets thinking in tokens; Codex selects a named effort level. There
is no faithful numeric mapping between them, so the source is recorded and each
codec decides how to honour the other's form rather than a lossy conversion
happening once, invisibly, in the middle.
