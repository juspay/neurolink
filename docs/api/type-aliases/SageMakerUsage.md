[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerUsage

# Type Alias: SageMakerUsage

> **SageMakerUsage** = `object`

Defined in: [types/providers.ts:1537](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1537)

Token usage and billing information

## Properties

### promptTokens

> **promptTokens**: `number`

Defined in: [types/providers.ts:1539](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1539)

Number of prompt tokens

---

### completionTokens

> **completionTokens**: `number`

Defined in: [types/providers.ts:1541](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1541)

Number of completion tokens

---

### total

> **total**: `number`

Defined in: [types/providers.ts:1543](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1543)

Total tokens used

---

### requestTime?

> `optional` **requestTime?**: `number`

Defined in: [types/providers.ts:1545](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1545)

Request processing time in milliseconds

---

### inferenceTime?

> `optional` **inferenceTime?**: `number`

Defined in: [types/providers.ts:1547](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1547)

Model inference time in milliseconds

---

### estimatedCost?

> `optional` **estimatedCost?**: `number`

Defined in: [types/providers.ts:1549](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1549)

Estimated cost in USD
