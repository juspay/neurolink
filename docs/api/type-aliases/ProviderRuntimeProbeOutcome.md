[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderRuntimeProbeOutcome

# Type Alias: ProviderRuntimeProbeOutcome

> **ProviderRuntimeProbeOutcome** = `object`

Defined in: [types/providers.ts:2016](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2016)

Outcome of a provider-specific config check's own outbound runtime probe
(LiteLLM's `/v1/models`, Ollama's `/api/tags` availability check) — the
request `checkLiteLLMConfig`/`checkOllamaConfig` make from inside step 1
(`checkEnvironmentConfiguration`), independent of the step-3 connectivity
test. `checkProviderHealth`'s circuit breaker needs to know whether this
probe ran at all (a blacklisted provider skips it — `ran: false`) and,
if it ran, whether it failed, so a dead local proxy counts toward the
breaker the same way a failing step-3 probe does. `ran: false` must never
move the breaker either way — it is not evidence the provider is up OR
down.

## Properties

### ran

> **ran**: `boolean`

Defined in: [types/providers.ts:2017](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2017)

---

### failed

> **failed**: `boolean`

Defined in: [types/providers.ts:2018](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2018)
