[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelComparison

# Type Alias: ModelComparison

> **ModelComparison** = `object`

Model comparison result

## Properties

### models

> **models**: [`ModelInfo`](ModelInfo.md)[]

---

### comparison

> **comparison**: `object`

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
