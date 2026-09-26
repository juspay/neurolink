[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SamplerConfig

# Type Alias: SamplerConfig

> **SamplerConfig** = \{ `type`: `"always"`; \} \| \{ `type`: `"never"`; \} \| \{ `type`: `"ratio"`; `ratio`: `number`; \} \| \{ `type`: `"trace-id-ratio"`; `ratio`: `number`; \} \| \{ `type`: `"attribute-based"`; `rules`: [`SamplingRule`](SamplingRule.md)[]; `defaultRatio?`: `number`; \} \| \{ `type`: `"priority"`; `rules`: [`SamplingRule`](SamplingRule.md)[]; `defaultRatio?`: `number`; \} \| \{ `type`: `"error-only"`; \} \| \{ `type`: `"custom"`; `rules?`: [`SamplingRule`](SamplingRule.md)[]; `defaultRatio?`: `number`; \}

Sampler configuration — discriminated union keyed on `type`.
Each variant carries only the fields relevant to that sampler.
