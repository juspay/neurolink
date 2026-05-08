[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderModelConfig

# Type Alias: ProviderModelConfig

> **ProviderModelConfig** = `object`

Defined in: [types/evaluationProviders.ts:14](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluationProviders.ts#L14)

Legacy provider model configuration for evaluation

## Properties

### provider

> **provider**: `string`

Defined in: [types/evaluationProviders.ts:15](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluationProviders.ts#L15)

---

### models

> **models**: `string`[]

Defined in: [types/evaluationProviders.ts:16](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluationProviders.ts#L16)

---

### costPerToken?

> `optional` **costPerToken?**: `number` \| \{ `input`: `number`; `output`: `number`; \}

Defined in: [types/evaluationProviders.ts:17](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluationProviders.ts#L17)

---

### requiresApiKey?

> `optional` **requiresApiKey?**: `string`[]

Defined in: [types/evaluationProviders.ts:18](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluationProviders.ts#L18)

---

### performance?

> `optional` **performance?**: `object`

Defined in: [types/evaluationProviders.ts:19](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluationProviders.ts#L19)

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
