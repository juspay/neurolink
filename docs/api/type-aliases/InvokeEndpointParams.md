[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InvokeEndpointParams

# Type Alias: InvokeEndpointParams

> **InvokeEndpointParams** = `object`

Defined in: [types/providers.ts:1494](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1494)

Parameters for SageMaker endpoint invocation

## Properties

### EndpointName

> **EndpointName**: `string`

Defined in: [types/providers.ts:1496](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1496)

Endpoint name to invoke

---

### Body

> **Body**: `string` \| `Uint8Array`

Defined in: [types/providers.ts:1498](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1498)

Request body as string or Uint8Array

---

### ContentType?

> `optional` **ContentType?**: `string`

Defined in: [types/providers.ts:1500](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1500)

Content type of the request

---

### Accept?

> `optional` **Accept?**: `string`

Defined in: [types/providers.ts:1502](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1502)

Accept header for response format

---

### CustomAttributes?

> `optional` **CustomAttributes?**: `string`

Defined in: [types/providers.ts:1504](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1504)

Custom attributes for the request

---

### TargetModel?

> `optional` **TargetModel?**: `string`

Defined in: [types/providers.ts:1506](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1506)

Target model for multi-model endpoints

---

### TargetVariant?

> `optional` **TargetVariant?**: `string`

Defined in: [types/providers.ts:1508](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1508)

Target variant for A/B testing

---

### InferenceId?

> `optional` **InferenceId?**: `string`

Defined in: [types/providers.ts:1510](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1510)

Inference ID for request tracking
