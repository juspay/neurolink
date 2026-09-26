[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDetectionResult

# Type Alias: ModelDetectionResult

> **ModelDetectionResult** = `object`

Defined in: [types/providers.ts:2417](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2417)

Model type detection result.

## Properties

### type

> **type**: [`StreamingCapability`](StreamingCapability.md)\[`"modelType"`\]

Defined in: [types/providers.ts:2418](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2418)

---

### confidence

> **confidence**: `number`

Defined in: [types/providers.ts:2419](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2419)

---

### evidence

> **evidence**: `string`[]

Defined in: [types/providers.ts:2420](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2420)

---

### suggestedConfig?

> `optional` **suggestedConfig?**: `Partial`\<[`SageMakerModelConfig`](SageMakerModelConfig.md)\>

Defined in: [types/providers.ts:2421](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2421)
