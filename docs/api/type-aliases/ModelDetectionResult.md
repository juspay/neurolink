[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDetectionResult

# Type Alias: ModelDetectionResult

> **ModelDetectionResult** = `object`

Defined in: [types/providers.ts:2346](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2346)

Model type detection result.

## Properties

### type

> **type**: [`StreamingCapability`](StreamingCapability.md)\[`"modelType"`\]

Defined in: [types/providers.ts:2347](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2347)

---

### confidence

> **confidence**: `number`

Defined in: [types/providers.ts:2348](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2348)

---

### evidence

> **evidence**: `string`[]

Defined in: [types/providers.ts:2349](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2349)

---

### suggestedConfig?

> `optional` **suggestedConfig?**: `Partial`\<[`SageMakerModelConfig`](SageMakerModelConfig.md)\>

Defined in: [types/providers.ts:2350](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2350)
