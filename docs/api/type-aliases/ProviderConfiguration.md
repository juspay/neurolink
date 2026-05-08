[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderConfiguration

# Type Alias: ProviderConfiguration

> **ProviderConfiguration** = `object`

Defined in: [types/model.ts:45](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L45)

Provider configuration for model management

## Properties

### provider

> **provider**: `string`

Defined in: [types/model.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L47)

Provider name

---

### models

> **models**: `Record`\<[`ModelTier`](ModelTier.md), `string`\>

Defined in: [types/model.ts:49](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L49)

Available models by tier

---

### defaultCost

> **defaultCost**: `object`

Defined in: [types/model.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L51)

Default cost per token (fallback)

#### input

> **input**: `number`

#### output

> **output**: `number`

---

### requiredEnvVars

> **requiredEnvVars**: `string`[]

Defined in: [types/model.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L56)

Required environment variables

---

### performance

> **performance**: `object`

Defined in: [types/model.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L58)

Provider-specific performance metrics

#### speed

> **speed**: `number`

#### quality

> **quality**: `number`

#### cost

> **cost**: `number`

---

### modelConfigs?

> `optional` **modelConfigs?**: `Record`\<`string`, [`ModelConfig`](ModelConfig.md)\>

Defined in: [types/model.ts:64](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L64)

Provider-specific model configurations

---

### modelBehavior?

> `optional` **modelBehavior?**: `object`

Defined in: [types/model.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L66)

Provider-specific model behavior configurations

#### maxTokensIssues?

> `optional` **maxTokensIssues?**: `string`[]

Models that have issues with maxTokens parameter

#### specialHandling?

> `optional` **specialHandling?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Models that require special handling

#### toolCapableModels?

> `optional` **toolCapableModels?**: `string`[]

Models that support tool calling (Ollama-specific)
