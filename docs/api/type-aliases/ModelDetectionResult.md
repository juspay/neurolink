[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDetectionResult

# Type Alias: ModelDetectionResult

> **ModelDetectionResult** = `object`

Defined in: [types/providers.ts:2350](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2350)

Model type detection result.

## Properties

### type

> **type**: [`StreamingCapability`](StreamingCapability.md)\[`"modelType"`\]

Defined in: [types/providers.ts:2351](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2351)

---

### confidence

> **confidence**: `number`

Defined in: [types/providers.ts:2352](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2352)

---

### evidence

> **evidence**: `string`[]

Defined in: [types/providers.ts:2353](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2353)

---

### suggestedConfig?

> `optional` **suggestedConfig?**: `Partial`\<[`SageMakerModelConfig`](SageMakerModelConfig.md)\>

Defined in: [types/providers.ts:2354](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2354)
