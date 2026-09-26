[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InvokeEndpointParams

# Type Alias: InvokeEndpointParams

> **InvokeEndpointParams** = `object`

Parameters for SageMaker endpoint invocation

## Properties

### EndpointName

> **EndpointName**: `string`

Endpoint name to invoke

---

### Body

> **Body**: `string` \| `Uint8Array`

Request body as string or Uint8Array

---

### ContentType?

> `optional` **ContentType?**: `string`

Content type of the request

---

### Accept?

> `optional` **Accept?**: `string`

Accept header for response format

---

### CustomAttributes?

> `optional` **CustomAttributes?**: `string`

Custom attributes for the request

---

### TargetModel?

> `optional` **TargetModel?**: `string`

Target model for multi-model endpoints

---

### TargetVariant?

> `optional` **TargetVariant?**: `string`

Target variant for A/B testing

---

### InferenceId?

> `optional` **InferenceId?**: `string`

Inference ID for request tracking

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Cancels the in-flight HTTP request, not just the loop around it.

Named in camelCase deliberately: every other field here mirrors an AWS
`InvokeEndpointCommandInput` member and keeps its PascalCase, whereas this
one is a transport option handed to `client.send()` as
`@smithy/types` `HttpHandlerOptions` — it is never part of the command
payload, and spelling it differently keeps that boundary visible.
