[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDetectionResult

# Type Alias: ModelDetectionResult

> **ModelDetectionResult** = `object`

Defined in: [types/providers.ts:2257](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2257)

Model type detection result.

## Properties

### type

> **type**: [`StreamingCapability`](StreamingCapability.md)\[`"modelType"`\]

Defined in: [types/providers.ts:2258](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2258)

---

### confidence

> **confidence**: `number`

Defined in: [types/providers.ts:2259](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2259)

---

### evidence

> **evidence**: `string`[]

Defined in: [types/providers.ts:2260](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2260)

---

### suggestedConfig?

> `optional` **suggestedConfig?**: `Partial`\<[`SageMakerModelConfig`](SageMakerModelConfig.md)\>

Defined in: [types/providers.ts:2261](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2261)
