[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderModelConfig

# Type Alias: ProviderModelConfig

> **ProviderModelConfig** = `object`

Legacy provider model configuration for evaluation

## Properties

### provider

> **provider**: `string`

---

### models

> **models**: `string`[]

---

### costPerToken?

> `optional` **costPerToken?**: `number` \| \{ `input`: `number`; `output`: `number`; \}

---

### requiresApiKey?

> `optional` **requiresApiKey?**: `string`[]

---

### performance?

> `optional` **performance?**: `object`

#### averageLatency?

> `optional` **averageLatency?**: `number`

#### reliability?

> `optional` **reliability?**: `number`

#### speed?

> `optional` **speed?**: `number`

#### quality?

> `optional` **quality?**: `number`

#### cost?

> `optional` **cost?**: `number`
