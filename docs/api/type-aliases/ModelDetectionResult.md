[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDetectionResult

# Type Alias: ModelDetectionResult

> **ModelDetectionResult** = `object`

Defined in: [types/providers.ts:2232](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2232)

Model type detection result.

## Properties

### type

> **type**: [`StreamingCapability`](StreamingCapability.md)\[`"modelType"`\]

Defined in: [types/providers.ts:2233](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2233)

---

### confidence

> **confidence**: `number`

Defined in: [types/providers.ts:2234](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2234)

---

### evidence

> **evidence**: `string`[]

Defined in: [types/providers.ts:2235](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2235)

---

### suggestedConfig?

> `optional` **suggestedConfig?**: `Partial`\<[`SageMakerModelConfig`](SageMakerModelConfig.md)\>

Defined in: [types/providers.ts:2236](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2236)
