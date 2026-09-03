[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerUsage

# Type Alias: SageMakerUsage

> **SageMakerUsage** = `object`

Defined in: [types/providers.ts:1484](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1484)

Token usage and billing information

## Properties

### promptTokens

> **promptTokens**: `number`

Defined in: [types/providers.ts:1486](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1486)

Number of prompt tokens

---

### completionTokens

> **completionTokens**: `number`

Defined in: [types/providers.ts:1488](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1488)

Number of completion tokens

---

### total

> **total**: `number`

Defined in: [types/providers.ts:1490](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1490)

Total tokens used

---

### requestTime?

> `optional` **requestTime?**: `number`

Defined in: [types/providers.ts:1492](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1492)

Request processing time in milliseconds

---

### inferenceTime?

> `optional` **inferenceTime?**: `number`

Defined in: [types/providers.ts:1494](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1494)

Model inference time in milliseconds

---

### estimatedCost?

> `optional` **estimatedCost?**: `number`

Defined in: [types/providers.ts:1496](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1496)

Estimated cost in USD
