[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelInfo

# Type Alias: ModelInfo

> **ModelInfo** = `object`

Defined in: [types/model.ts:170](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L170)

Complete model information

## Properties

### id

> **id**: `string`

Defined in: [types/model.ts:171](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L171)

---

### name

> **name**: `string`

Defined in: [types/model.ts:172](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L172)

---

### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

Defined in: [types/model.ts:173](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L173)

---

### description

> **description**: `string`

Defined in: [types/model.ts:174](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L174)

---

### capabilities

> **capabilities**: [`ModelCapabilities`](ModelCapabilities.md)

Defined in: [types/model.ts:175](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L175)

---

### pricing

> **pricing**: [`ModelPricingInfo`](ModelPricingInfo.md)

Defined in: [types/model.ts:176](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L176)

---

### performance

> **performance**: [`ModelPerformance`](ModelPerformance.md)

Defined in: [types/model.ts:177](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L177)

---

### limits

> **limits**: [`ModelLimits`](ModelLimits.md)

Defined in: [types/model.ts:178](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L178)

---

### useCases

> **useCases**: [`UseCaseSuitability`](UseCaseSuitability.md)

Defined in: [types/model.ts:179](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L179)

---

### aliases

> **aliases**: `string`[]

Defined in: [types/model.ts:180](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L180)

---

### deprecated

> **deprecated**: `boolean`

Defined in: [types/model.ts:181](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L181)

---

### isLocal

> **isLocal**: `boolean`

Defined in: [types/model.ts:182](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L182)

---

### releaseDate?

> `optional` **releaseDate?**: `string`

Defined in: [types/model.ts:183](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L183)

---

### category

> **category**: `"general"` \| `"coding"` \| `"creative"` \| `"vision"` \| `"reasoning"`

Defined in: [types/model.ts:184](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L184)
