[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderRuntimeProbeOutcome

# Type Alias: ProviderRuntimeProbeOutcome

> **ProviderRuntimeProbeOutcome** = `object`

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

---

### failed

> **failed**: `boolean`
