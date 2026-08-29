[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDetectionResult

# Type Alias: ModelDetectionResult

> **ModelDetectionResult** = `object`

Defined in: [types/providers.ts:2264](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2264)

Model type detection result.

## Properties

### type

> **type**: [`StreamingCapability`](StreamingCapability.md)\[`"modelType"`\]

Defined in: [types/providers.ts:2265](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2265)

---

### confidence

> **confidence**: `number`

Defined in: [types/providers.ts:2266](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2266)

---

### evidence

> **evidence**: `string`[]

Defined in: [types/providers.ts:2267](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2267)

---

### suggestedConfig?

> `optional` **suggestedConfig?**: `Partial`\<[`SageMakerModelConfig`](SageMakerModelConfig.md)\>

Defined in: [types/providers.ts:2268](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2268)
