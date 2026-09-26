[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InvokeEndpointParams

# Type Alias: InvokeEndpointParams

> **InvokeEndpointParams** = `object`

Defined in: [types/providers.ts:1582](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1582)

Parameters for SageMaker endpoint invocation

## Properties

### EndpointName

> **EndpointName**: `string`

Defined in: [types/providers.ts:1584](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1584)

Endpoint name to invoke

---

### Body

> **Body**: `string` \| `Uint8Array`

Defined in: [types/providers.ts:1586](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1586)

Request body as string or Uint8Array

---

### ContentType?

> `optional` **ContentType?**: `string`

Defined in: [types/providers.ts:1588](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1588)

Content type of the request

---

### Accept?

> `optional` **Accept?**: `string`

Defined in: [types/providers.ts:1590](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1590)

Accept header for response format

---

### CustomAttributes?

> `optional` **CustomAttributes?**: `string`

Defined in: [types/providers.ts:1592](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1592)

Custom attributes for the request

---

### TargetModel?

> `optional` **TargetModel?**: `string`

Defined in: [types/providers.ts:1594](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1594)

Target model for multi-model endpoints

---

### TargetVariant?

> `optional` **TargetVariant?**: `string`

Defined in: [types/providers.ts:1596](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1596)

Target variant for A/B testing

---

### InferenceId?

> `optional` **InferenceId?**: `string`

Defined in: [types/providers.ts:1598](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1598)

Inference ID for request tracking

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/providers.ts:1608](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1608)

Cancels the in-flight HTTP request, not just the loop around it.

Named in camelCase deliberately: every other field here mirrors an AWS
`InvokeEndpointCommandInput` member and keeps its PascalCase, whereas this
one is a transport option handed to `client.send()` as
`@smithy/types` `HttpHandlerOptions` — it is never part of the command
payload, and spelling it differently keeps that boundary visible.
