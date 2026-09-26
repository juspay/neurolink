[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderConfiguration

# Type Alias: ProviderConfiguration

> **ProviderConfiguration** = `object`

Provider configuration for model management

## Properties

### provider

> **provider**: `string`

Provider name

---

### models

> **models**: `Record`\<[`ModelTier`](ModelTier.md), `string`\>

Available models by tier

---

### defaultCost

> **defaultCost**: `object`

Default cost per token (fallback)

#### input

> **input**: `number`

#### output

> **output**: `number`

---

### requiredEnvVars

> **requiredEnvVars**: `string`[]

Required environment variables

---

### performance

> **performance**: `object`

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

Provider-specific model configurations

---

### modelBehavior?

> `optional` **modelBehavior?**: `object`

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
