[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InvokeEndpointParams

# Type Alias: InvokeEndpointParams

> **InvokeEndpointParams** = `object`

Defined in: [types/providers.ts:1525](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1525)

Parameters for SageMaker endpoint invocation

## Properties

### EndpointName

> **EndpointName**: `string`

Defined in: [types/providers.ts:1527](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1527)

Endpoint name to invoke

---

### Body

> **Body**: `string` \| `Uint8Array`

Defined in: [types/providers.ts:1529](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1529)

Request body as string or Uint8Array

---

### ContentType?

> `optional` **ContentType?**: `string`

Defined in: [types/providers.ts:1531](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1531)

Content type of the request

---

### Accept?

> `optional` **Accept?**: `string`

Defined in: [types/providers.ts:1533](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1533)

Accept header for response format

---

### CustomAttributes?

> `optional` **CustomAttributes?**: `string`

Defined in: [types/providers.ts:1535](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1535)

Custom attributes for the request

---

### TargetModel?

> `optional` **TargetModel?**: `string`

Defined in: [types/providers.ts:1537](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1537)

Target model for multi-model endpoints

---

### TargetVariant?

> `optional` **TargetVariant?**: `string`

Defined in: [types/providers.ts:1539](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1539)

Target variant for A/B testing

---

### InferenceId?

> `optional` **InferenceId?**: `string`

Defined in: [types/providers.ts:1541](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1541)

Inference ID for request tracking

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/providers.ts:1551](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1551)

Cancels the in-flight HTTP request, not just the loop around it.

Named in camelCase deliberately: every other field here mirrors an AWS
`InvokeEndpointCommandInput` member and keeps its PascalCase, whereas this
one is a transport option handed to `client.send()` as
`@smithy/types` `HttpHandlerOptions` — it is never part of the command
payload, and spelling it differently keeps that boundary visible.
