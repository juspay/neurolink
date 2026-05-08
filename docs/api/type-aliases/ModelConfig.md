[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelConfig

# Type Alias: ModelConfig

> **ModelConfig** = `object`

Defined in: [types/model.ts:24](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L24)

Model configuration for a specific provider

## Properties

### id

> **id**: `string`

Defined in: [types/model.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L26)

Model identifier

---

### name

> **name**: `string`

Defined in: [types/model.ts:28](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L28)

Display name

---

### tier

> **tier**: [`ModelTier`](ModelTier.md)

Defined in: [types/model.ts:30](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L30)

Performance tier

---

### cost

> **cost**: `object`

Defined in: [types/model.ts:32](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L32)

Cost per 1K tokens

#### input

> **input**: `number`

#### output

> **output**: `number`

---

### capabilities

> **capabilities**: `string`[]

Defined in: [types/model.ts:37](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L37)

Model capabilities

---

### options?

> `optional` **options?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/model.ts:39](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L39)

Model-specific options
