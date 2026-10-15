[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierStrategyKind

# Type Alias: ClassifierStrategyKind

> **ClassifierStrategyKind** = `"heuristic"` \| `"llm"` \| `"jev"` \| `"auto"`

Which classification strategy to run.

- `heuristic` — keyword/length scoring. Deterministic, zero latency.
- `llm` — a cheap classifier model via the injected `generate`.
- `jev` — a decision model, whichever decision provider is configured
  (TypeSafe's Jev, Laya, XOR, SubQ, Perplexity, Cloudflare Clef, OpenAI
  Decisions or ScaleDown); one round trip that returns the confidence the provider
  reports (_calibrated_ on TypeSafe's Jev, ~400ms there) rather than a
  self-reported one.
- `auto` — `jev` when a decision provider is configured, in the environment
  or in SDK credentials (`TYPESAFE_API_KEY`, `LAYA_API_KEY` with
  `LAYA_BASE_URL`, `XOR_API_KEY` with `XOR_BASE_URL`, `SUBQ_API_KEY`, `PERPLEXITY_API_KEY`,
  `CLOUDFLARE_API_KEY` with `CLOUDFLARE_ACCOUNT_ID`, `OPENAI_API_KEY`,
  which does not count while `OPENAI_BASE_URL`, `OPENAI_API_BASE` or `credentials.openai.baseURL` names a
  host other than `https://api.openai.com`, or `SCALEDOWN_API_KEY`), otherwise `heuristic`.
