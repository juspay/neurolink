[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDetectionResult

# Type Alias: ModelDetectionResult

> **ModelDetectionResult** = `object`

Defined in: [types/providers.ts:2267](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2267)

Model type detection result.

## Properties

### type

> **type**: [`StreamingCapability`](StreamingCapability.md)\[`"modelType"`\]

Defined in: [types/providers.ts:2268](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2268)

---

### confidence

> **confidence**: `number`

Defined in: [types/providers.ts:2269](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2269)

---

### evidence

> **evidence**: `string`[]

Defined in: [types/providers.ts:2270](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2270)

---

### suggestedConfig?

> `optional` **suggestedConfig?**: `Partial`\<[`SageMakerModelConfig`](SageMakerModelConfig.md)\>

Defined in: [types/providers.ts:2271](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2271)
