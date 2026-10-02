[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierStrategyKind

# Type Alias: ClassifierStrategyKind

> **ClassifierStrategyKind** = `"heuristic"` \| `"llm"` \| `"jev"` \| `"auto"`

Which classification strategy to run.

- `heuristic` — keyword/length scoring. Deterministic, zero latency.
- `llm` — a cheap classifier model via the injected `generate`.
- `jev` — TypeSafe's System One model; one ~400ms round trip that returns a
  _calibrated_ confidence rather than a self-reported one.
- `auto` — `jev` when a decision provider is configured, in the environment
  or in SDK credentials (`TYPESAFE_API_KEY`, `LAYA_API_KEY` with
  `LAYA_BASE_URL`, `XOR_API_KEY` with `XOR_BASE_URL`, or
  `PERPLEXITY_API_KEY`), otherwise
  `heuristic`.
