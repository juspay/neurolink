[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDetectionResult

# Type Alias: ModelDetectionResult

> **ModelDetectionResult** = `object`

Defined in: [types/providers.ts:2254](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2254)

Model type detection result.

## Properties

### type

> **type**: [`StreamingCapability`](StreamingCapability.md)\[`"modelType"`\]

Defined in: [types/providers.ts:2255](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2255)

---

### confidence

> **confidence**: `number`

Defined in: [types/providers.ts:2256](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2256)

---

### evidence

> **evidence**: `string`[]

Defined in: [types/providers.ts:2257](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2257)

---

### suggestedConfig?

> `optional` **suggestedConfig?**: `Partial`\<[`SageMakerModelConfig`](SageMakerModelConfig.md)\>

Defined in: [types/providers.ts:2258](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2258)
