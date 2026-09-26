[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDetectionResult

# Type Alias: ModelDetectionResult

> **ModelDetectionResult** = `object`

Defined in: [types/providers.ts:2377](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2377)

Model type detection result.

## Properties

### type

> **type**: [`StreamingCapability`](StreamingCapability.md)\[`"modelType"`\]

Defined in: [types/providers.ts:2378](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2378)

---

### confidence

> **confidence**: `number`

Defined in: [types/providers.ts:2379](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2379)

---

### evidence

> **evidence**: `string`[]

Defined in: [types/providers.ts:2380](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2380)

---

### suggestedConfig?

> `optional` **suggestedConfig?**: `Partial`\<[`SageMakerModelConfig`](SageMakerModelConfig.md)\>

Defined in: [types/providers.ts:2381](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2381)
