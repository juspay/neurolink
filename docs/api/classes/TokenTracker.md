[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenTracker

# Class: TokenTracker

Defined in: [observability/tokenTracker.ts:81](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/tokenTracker.ts#L81)

Token tracker for aggregating usage across spans

## Constructors

### Constructor

> **new TokenTracker**(): `TokenTracker`

#### Returns

`TokenTracker`

## Methods

### setObservabilityModelPricing()

> **setObservabilityModelPricing**(`modelName`, `pricing`): `void`

Defined in: [observability/tokenTracker.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/tokenTracker.ts#L102)

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

Defined in: [observability/tokenTracker.ts:114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/tokenTracker.ts#L114)

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

Defined in: [observability/tokenTracker.ts:123](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/tokenTracker.ts#L123)

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

Defined in: [observability/tokenTracker.ts:136](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/tokenTracker.ts#L136)

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

Defined in: [observability/tokenTracker.ts:144](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/tokenTracker.ts#L144)

Get all available model pricing (custom + built-in)

#### Returns

`Record`\<`string`, [`ObservabilityModelPricing`](../type-aliases/ObservabilityModelPricing.md)\>

Record of all model pricing

---

### removeCustomPricing()

> **removeCustomPricing**(`model`): `boolean`

Defined in: [observability/tokenTracker.ts:160](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/tokenTracker.ts#L160)

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

Defined in: [observability/tokenTracker.ts:167](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/tokenTracker.ts#L167)

Track token usage from a span

#### Parameters

##### span

[`SpanData`](../type-aliases/SpanData.md)

#### Returns

`void`

---

### trackUsage()

> **trackUsage**(`usage`): `void`

Defined in: [observability/tokenTracker.ts:274](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/tokenTracker.ts#L274)

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

Defined in: [observability/tokenTracker.ts:347](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/tokenTracker.ts#L347)

Get current stats

#### Returns

[`TokenUsageStats`](../type-aliases/TokenUsageStats.md)

---

### getStatsForWindow()

> **getStatsForWindow**(`spans`): [`TokenUsageStats`](../type-aliases/TokenUsageStats.md)

Defined in: [observability/tokenTracker.ts:354](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/tokenTracker.ts#L354)

Get stats for a specific time window of spans

#### Parameters

##### spans

[`SpanData`](../type-aliases/SpanData.md)[]

#### Returns

[`TokenUsageStats`](../type-aliases/TokenUsageStats.md)

---

### reset()

> **reset**(): `void`

Defined in: [observability/tokenTracker.ts:369](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/tokenTracker.ts#L369)

Reset all stats

#### Returns

`void`

---

### toJSON()

> **toJSON**(): `Record`\<`string`, `unknown`\>

Defined in: [observability/tokenTracker.ts:387](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/tokenTracker.ts#L387)

Export stats as JSON

#### Returns

`Record`\<`string`, `unknown`\>

---

### formatCost()

> **formatCost**(`cost`, `currency?`): `string`

Defined in: [observability/tokenTracker.ts:405](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/tokenTracker.ts#L405)

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

Defined in: [observability/tokenTracker.ts:416](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/observability/tokenTracker.ts#L416)

Get a summary string of current stats

#### Returns

`string`
