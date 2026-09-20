[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / servesInferenceKind

# Function: servesInferenceKind()

> **servesInferenceKind**(`descriptor`, `kind`): `boolean`

Defined in: [utils/decisionAnswers.ts:78](https://github.com/juspay/neurolink/blob/release/src/lib/utils/decisionAnswers.ts#L78)

Whether a descriptor declares support for a given inference type.

## Parameters

### descriptor

`Pick`\<[`ProviderDescriptor`](../type-aliases/ProviderDescriptor.md), `"inferenceKinds"`\>

### kind

`"generate"` \| `"stream"` \| `"decide"`

## Returns

`boolean`
