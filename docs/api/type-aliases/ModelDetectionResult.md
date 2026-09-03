[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDetectionResult

# Type Alias: ModelDetectionResult

> **ModelDetectionResult** = `object`

Defined in: [types/providers.ts:2272](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2272)

Model type detection result.

## Properties

### type

> **type**: [`StreamingCapability`](StreamingCapability.md)\[`"modelType"`\]

Defined in: [types/providers.ts:2273](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2273)

---

### confidence

> **confidence**: `number`

Defined in: [types/providers.ts:2274](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2274)

---

### evidence

> **evidence**: `string`[]

Defined in: [types/providers.ts:2275](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2275)

---

### suggestedConfig?

> `optional` **suggestedConfig?**: `Partial`\<[`SageMakerModelConfig`](SageMakerModelConfig.md)\>

Defined in: [types/providers.ts:2276](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2276)
