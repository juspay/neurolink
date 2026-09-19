[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDetectionResult

# Type Alias: ModelDetectionResult

> **ModelDetectionResult** = `object`

Defined in: [types/providers.ts:2298](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2298)

Model type detection result.

## Properties

### type

> **type**: [`StreamingCapability`](StreamingCapability.md)\[`"modelType"`\]

Defined in: [types/providers.ts:2299](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2299)

---

### confidence

> **confidence**: `number`

Defined in: [types/providers.ts:2300](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2300)

---

### evidence

> **evidence**: `string`[]

Defined in: [types/providers.ts:2301](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2301)

---

### suggestedConfig?

> `optional` **suggestedConfig?**: `Partial`\<[`SageMakerModelConfig`](SageMakerModelConfig.md)\>

Defined in: [types/providers.ts:2302](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2302)
