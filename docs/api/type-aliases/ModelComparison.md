[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelComparison

# Type Alias: ModelComparison

> **ModelComparison** = `object`

Defined in: [types/model.ts:244](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L244)

Model comparison result

## Properties

### models

> **models**: [`ModelInfo`](ModelInfo.md)[]

Defined in: [types/model.ts:245](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L245)

---

### comparison

> **comparison**: `object`

Defined in: [types/model.ts:246](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L246)

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
