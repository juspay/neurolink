[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDetectionResult

# Type Alias: ModelDetectionResult

> **ModelDetectionResult** = `object`

Defined in: [types/providers.ts:2289](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2289)

Model type detection result.

## Properties

### type

> **type**: [`StreamingCapability`](StreamingCapability.md)\[`"modelType"`\]

Defined in: [types/providers.ts:2290](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2290)

---

### confidence

> **confidence**: `number`

Defined in: [types/providers.ts:2291](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2291)

---

### evidence

> **evidence**: `string`[]

Defined in: [types/providers.ts:2292](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2292)

---

### suggestedConfig?

> `optional` **suggestedConfig?**: `Partial`\<[`SageMakerModelConfig`](SageMakerModelConfig.md)\>

Defined in: [types/providers.ts:2293](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2293)
