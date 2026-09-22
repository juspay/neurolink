[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerUsage

# Type Alias: SageMakerUsage

> **SageMakerUsage** = `object`

Defined in: [types/providers.ts:1542](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1542)

Token usage and billing information

## Properties

### promptTokens

> **promptTokens**: `number`

Defined in: [types/providers.ts:1544](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1544)

Number of prompt tokens

---

### completionTokens

> **completionTokens**: `number`

Defined in: [types/providers.ts:1546](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1546)

Number of completion tokens

---

### total

> **total**: `number`

Defined in: [types/providers.ts:1548](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1548)

Total tokens used

---

### requestTime?

> `optional` **requestTime?**: `number`

Defined in: [types/providers.ts:1550](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1550)

Request processing time in milliseconds

---

### inferenceTime?

> `optional` **inferenceTime?**: `number`

Defined in: [types/providers.ts:1552](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1552)

Model inference time in milliseconds

---

### estimatedCost?

> `optional` **estimatedCost?**: `number`

Defined in: [types/providers.ts:1554](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1554)

Estimated cost in USD
