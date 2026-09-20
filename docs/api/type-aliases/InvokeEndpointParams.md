[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InvokeEndpointParams

# Type Alias: InvokeEndpointParams

> **InvokeEndpointParams** = `object`

Defined in: [types/providers.ts:1555](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1555)

Parameters for SageMaker endpoint invocation

## Properties

### EndpointName

> **EndpointName**: `string`

Defined in: [types/providers.ts:1557](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1557)

Endpoint name to invoke

---

### Body

> **Body**: `string` \| `Uint8Array`

Defined in: [types/providers.ts:1559](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1559)

Request body as string or Uint8Array

---

### ContentType?

> `optional` **ContentType?**: `string`

Defined in: [types/providers.ts:1561](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1561)

Content type of the request

---

### Accept?

> `optional` **Accept?**: `string`

Defined in: [types/providers.ts:1563](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1563)

Accept header for response format

---

### CustomAttributes?

> `optional` **CustomAttributes?**: `string`

Defined in: [types/providers.ts:1565](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1565)

Custom attributes for the request

---

### TargetModel?

> `optional` **TargetModel?**: `string`

Defined in: [types/providers.ts:1567](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1567)

Target model for multi-model endpoints

---

### TargetVariant?

> `optional` **TargetVariant?**: `string`

Defined in: [types/providers.ts:1569](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1569)

Target variant for A/B testing

---

### InferenceId?

> `optional` **InferenceId?**: `string`

Defined in: [types/providers.ts:1571](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1571)

Inference ID for request tracking

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/providers.ts:1581](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1581)

Cancels the in-flight HTTP request, not just the loop around it.

Named in camelCase deliberately: every other field here mirrors an AWS
`InvokeEndpointCommandInput` member and keeps its PascalCase, whereas this
one is a transport option handed to `client.send()` as
`@smithy/types` `HttpHandlerOptions` — it is never part of the command
payload, and spelling it differently keeps that boundary visible.
