[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDetectionResult

# Type Alias: ModelDetectionResult

> **ModelDetectionResult** = `object`

Defined in: [types/providers.ts:2353](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2353)

Model type detection result.

## Properties

### type

> **type**: [`StreamingCapability`](StreamingCapability.md)\[`"modelType"`\]

Defined in: [types/providers.ts:2354](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2354)

---

### confidence

> **confidence**: `number`

Defined in: [types/providers.ts:2355](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2355)

---

### evidence

> **evidence**: `string`[]

Defined in: [types/providers.ts:2356](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2356)

---

### suggestedConfig?

> `optional` **suggestedConfig?**: `Partial`\<[`SageMakerModelConfig`](SageMakerModelConfig.md)\>

Defined in: [types/providers.ts:2357](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2357)
