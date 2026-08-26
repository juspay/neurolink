[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerUsage

# Type Alias: SageMakerUsage

> **SageMakerUsage** = `object`

Defined in: [types/providers.ts:1473](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1473)

Token usage and billing information

## Properties

### promptTokens

> **promptTokens**: `number`

Defined in: [types/providers.ts:1475](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1475)

Number of prompt tokens

---

### completionTokens

> **completionTokens**: `number`

Defined in: [types/providers.ts:1477](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1477)

Number of completion tokens

---

### total

> **total**: `number`

Defined in: [types/providers.ts:1479](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1479)

Total tokens used

---

### requestTime?

> `optional` **requestTime?**: `number`

Defined in: [types/providers.ts:1481](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1481)

Request processing time in milliseconds

---

### inferenceTime?

> `optional` **inferenceTime?**: `number`

Defined in: [types/providers.ts:1483](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1483)

Model inference time in milliseconds

---

### estimatedCost?

> `optional` **estimatedCost?**: `number`

Defined in: [types/providers.ts:1485](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1485)

Estimated cost in USD
