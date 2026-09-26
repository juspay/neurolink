[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerUsage

# Type Alias: SageMakerUsage

> **SageMakerUsage** = `object`

Defined in: [types/providers.ts:1564](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1564)

Token usage and billing information

## Properties

### promptTokens

> **promptTokens**: `number`

Defined in: [types/providers.ts:1566](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1566)

Number of prompt tokens

---

### completionTokens

> **completionTokens**: `number`

Defined in: [types/providers.ts:1568](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1568)

Number of completion tokens

---

### total

> **total**: `number`

Defined in: [types/providers.ts:1570](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1570)

Total tokens used

---

### requestTime?

> `optional` **requestTime?**: `number`

Defined in: [types/providers.ts:1572](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1572)

Request processing time in milliseconds

---

### inferenceTime?

> `optional` **inferenceTime?**: `number`

Defined in: [types/providers.ts:1574](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1574)

Model inference time in milliseconds

---

### estimatedCost?

> `optional` **estimatedCost?**: `number`

Defined in: [types/providers.ts:1576](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1576)

Estimated cost in USD
