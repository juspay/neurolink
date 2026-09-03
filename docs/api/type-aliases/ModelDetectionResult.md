[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDetectionResult

# Type Alias: ModelDetectionResult

> **ModelDetectionResult** = `object`

Defined in: [types/providers.ts:2282](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2282)

Model type detection result.

## Properties

### type

> **type**: [`StreamingCapability`](StreamingCapability.md)\[`"modelType"`\]

Defined in: [types/providers.ts:2283](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2283)

---

### confidence

> **confidence**: `number`

Defined in: [types/providers.ts:2284](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2284)

---

### evidence

> **evidence**: `string`[]

Defined in: [types/providers.ts:2285](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2285)

---

### suggestedConfig?

> `optional` **suggestedConfig?**: `Partial`\<[`SageMakerModelConfig`](SageMakerModelConfig.md)\>

Defined in: [types/providers.ts:2286](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2286)
