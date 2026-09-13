[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InvokeEndpointParams

# Type Alias: InvokeEndpointParams

> **InvokeEndpointParams** = `object`

Defined in: [types/providers.ts:1499](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1499)

Parameters for SageMaker endpoint invocation

## Properties

### EndpointName

> **EndpointName**: `string`

Defined in: [types/providers.ts:1501](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1501)

Endpoint name to invoke

---

### Body

> **Body**: `string` \| `Uint8Array`

Defined in: [types/providers.ts:1503](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1503)

Request body as string or Uint8Array

---

### ContentType?

> `optional` **ContentType?**: `string`

Defined in: [types/providers.ts:1505](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1505)

Content type of the request

---

### Accept?

> `optional` **Accept?**: `string`

Defined in: [types/providers.ts:1507](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1507)

Accept header for response format

---

### CustomAttributes?

> `optional` **CustomAttributes?**: `string`

Defined in: [types/providers.ts:1509](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1509)

Custom attributes for the request

---

### TargetModel?

> `optional` **TargetModel?**: `string`

Defined in: [types/providers.ts:1511](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1511)

Target model for multi-model endpoints

---

### TargetVariant?

> `optional` **TargetVariant?**: `string`

Defined in: [types/providers.ts:1513](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1513)

Target variant for A/B testing

---

### InferenceId?

> `optional` **InferenceId?**: `string`

Defined in: [types/providers.ts:1515](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1515)

Inference ID for request tracking

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/providers.ts:1525](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1525)

Cancels the in-flight HTTP request, not just the loop around it.

Named in camelCase deliberately: every other field here mirrors an AWS
`InvokeEndpointCommandInput` member and keeps its PascalCase, whereas this
one is a transport option handed to `client.send()` as
`@smithy/types` `HttpHandlerOptions` — it is never part of the command
payload, and spelling it differently keeps that boundary visible.
