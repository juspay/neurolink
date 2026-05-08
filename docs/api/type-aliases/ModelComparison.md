[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelComparison

# Type Alias: ModelComparison

> **ModelComparison** = `object`

Defined in: [types/model.ts:236](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L236)

Model comparison result

## Properties

### models

> **models**: [`ModelInfo`](ModelInfo.md)[]

Defined in: [types/model.ts:237](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L237)

---

### comparison

> **comparison**: `object`

Defined in: [types/model.ts:238](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L238)

#### capabilities

> **capabilities**: `Record`\<keyof [`ModelCapabilities`](ModelCapabilities.md), [`ModelInfo`](ModelInfo.md)[]\>

#### pricing

> **pricing**: `object`

##### pricing.cheapest

> **cheapest**: [`ModelInfo`](ModelInfo.md)

##### pricing.mostExpensive

> **mostExpensive**: [`ModelInfo`](ModelInfo.md)

#### performance

> **performance**: `Record`\<`string`, [`ModelInfo`](ModelInfo.md)[]\>

#### contextSize

> **contextSize**: `object`

##### contextSize.largest

> **largest**: [`ModelInfo`](ModelInfo.md)

##### contextSize.smallest

> **smallest**: [`ModelInfo`](ModelInfo.md)
