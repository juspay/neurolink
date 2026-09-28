[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionSite

# Type Alias: DecisionSite

> **DecisionSite** = `"routing"` \| `"toolRouting"` \| `"contextRelevance"` \| `"summaryGate"` \| `"ragPlan"`

The built-in consumers of the `decide` inference type — one name per place
NeuroLink asks a decision model something on its own behalf. Each consumer
stamps its request with its site, which is what lets a host's
[DecisionHooks](DecisionHooks.md) tell the calls apart and lets telemetry attribute them.

- `routing` — the classifier router (difficulty, capabilities, risk, model, context scope)
- `toolRouting` — one yes/no per MCP server
- `contextRelevance` — one yes/no per earlier message, compaction stage 0
- `summaryGate` — accept or reject a generated summary, compaction stage 3
- `ragPlan` — per-query retrieval plan (`RAGPipeline` only)
