[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SamplerConfig

# Type Alias: SamplerConfig

> **SamplerConfig** = \{ `type`: `"always"`; \} \| \{ `type`: `"never"`; \} \| \{ `type`: `"ratio"`; `ratio`: `number`; \} \| \{ `type`: `"trace-id-ratio"`; `ratio`: `number`; \} \| \{ `type`: `"attribute-based"`; `rules`: [`SamplingRule`](SamplingRule.md)[]; `defaultRatio?`: `number`; \} \| \{ `type`: `"priority"`; `rules`: [`SamplingRule`](SamplingRule.md)[]; `defaultRatio?`: `number`; \} \| \{ `type`: `"error-only"`; \} \| \{ `type`: `"custom"`; `rules?`: [`SamplingRule`](SamplingRule.md)[]; `defaultRatio?`: `number`; \}

Defined in: [types/exporter.ts:237](https://github.com/juspay/neurolink/blob/release/src/lib/types/exporter.ts#L237)

Sampler configuration — discriminated union keyed on `type`.
Each variant carries only the fields relevant to that sampler.
