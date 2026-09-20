[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierStrategyKind

# Type Alias: ClassifierStrategyKind

> **ClassifierStrategyKind** = `"heuristic"` \| `"llm"` \| `"jev"` \| `"auto"`

Defined in: [types/classifierRouter.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L37)

Which classification strategy to run.

- `heuristic` — keyword/length scoring. Deterministic, zero latency.
- `llm` — a cheap classifier model via the injected `generate`.
- `jev` — TypeSafe's System One model; one ~400ms round trip that returns a
  _calibrated_ confidence rather than a self-reported one.
- `auto` — `jev` when `TYPESAFE_API_KEY` is set, otherwise `heuristic`.
