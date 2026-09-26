[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenTracker

# Class: TokenTracker

Token tracker for aggregating usage across spans

## Constructors

### Constructor

> **new TokenTracker**(): `TokenTracker`

#### Returns

`TokenTracker`

## Methods

### setObservabilityModelPricing()

> **setObservabilityModelPricing**(`modelName`, `pricing`): `void`

Set custom pricing for a single model

#### Parameters

##### modelName

`string`

The model name (e.g., "gpt-4o", "claude-3-5-sonnet")

##### pricing

[`ObservabilityModelPricing`](../type-aliases/ObservabilityModelPricing.md)

The pricing information

#### Returns

`void`

---

### updatePricing()

> **updatePricing**(`model`, `pricing`): `void`

Update pricing for an existing model (alias for setObservabilityModelPricing)

#### Parameters

##### model

`string`

The model name

##### pricing

[`ObservabilityModelPricing`](../type-aliases/ObservabilityModelPricing.md)

The new pricing information

#### Returns

`void`

---

### loadPricingFromConfig()

> **loadPricingFromConfig**(`config`): `void`

Load pricing configuration from a config object
Useful for loading pricing from environment or config files

#### Parameters

##### config

`Record`\<`string`, [`ObservabilityModelPricing`](../type-aliases/ObservabilityModelPricing.md)\>

Record of model names to pricing information

#### Returns

`void`

---

### getModelPricing()

> **getModelPricing**(`model`): [`ObservabilityModelPricing`](../type-aliases/ObservabilityModelPricing.md) \| `undefined`

Get pricing for a specific model

#### Parameters

##### model

`string`

The model name

#### Returns

[`ObservabilityModelPricing`](../type-aliases/ObservabilityModelPricing.md) \| `undefined`

The pricing information or undefined if not found

---

### getAllPricing()

> **getAllPricing**(): `Record`\<`string`, [`ObservabilityModelPricing`](../type-aliases/ObservabilityModelPricing.md)\>

Get all available model pricing (custom + built-in)

#### Returns

`Record`\<`string`, [`ObservabilityModelPricing`](../type-aliases/ObservabilityModelPricing.md)\>

Record of all model pricing

---

### removeCustomPricing()

> **removeCustomPricing**(`model`): `boolean`

Remove custom pricing for a model (falls back to built-in)

#### Parameters

##### model

`string`

The model name to remove custom pricing for

#### Returns

`boolean`

---

### trackSpan()

> **trackSpan**(`span`): `void`

Track token usage from a span

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

`void`

---

### trackUsage()

> **trackUsage**(`usage`): `void`

Track token usage from a simple usage object
This is a convenience method for tracking usage without a full span

#### Parameters

##### usage

Token usage data

###### promptTokens?

`number`

###### completionTokens?

`number`

###### totalTokens?

`number`

###### model?

`string`

###### provider?

`string`

#### Returns

`void`

---

### getStats()

> **getStats**(): [`TokenUsageStats`](../type-aliases/TokenUsageStats.md)

Get current stats

#### Returns

[`TokenUsageStats`](../type-aliases/TokenUsageStats.md)

---

### getStatsForWindow()

> **getStatsForWindow**(`spans`): [`TokenUsageStats`](../type-aliases/TokenUsageStats.md)

Get stats for a specific time window of spans

#### Parameters

##### spans

[`SpanData`](../type-aliases/SpanData.md)[]

#### Returns

[`TokenUsageStats`](../type-aliases/TokenUsageStats.md)

---

### reset()

> **reset**(): `void`

Reset all stats

#### Returns

`void`

---

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Export stats as JSON

#### Returns

`Record`\<`string`, `unknown`\>

---

### formatCost()

> **formatCost**(`cost`, `currency?`): `string`

Format cost as currency string

#### Parameters

##### cost

`number`

##### currency?

`string` = `"USD"`

#### Returns

`string`

---

### getSummary()

> **getSummary**(): `string`

Get a summary string of current stats

#### Returns

`string`
