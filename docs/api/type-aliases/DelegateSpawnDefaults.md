[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegateSpawnDefaults

# Type Alias: DelegateSpawnDefaults

> **DelegateSpawnDefaults** = `object`

Defined in: [types/delegation.ts:171](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L171)

Provider/model a model-invoked `delegate_task` spawn falls back to. The spawn
schema deliberately exposes no `provider` — a model cannot name a provider it
cannot see — so without a default the worker instance falls back to provider
auto-selection, which on a host with stray credentials puts a worker on a
provider nobody configured — observed live as workers walking several
unconfigured providers before reaching the configured one. The model's own
`model` argument still wins over `model` here.

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/delegation.ts:172](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L172)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/delegation.ts:173](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L173)
