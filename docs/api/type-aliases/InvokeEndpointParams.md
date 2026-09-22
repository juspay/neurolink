[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InvokeEndpointParams

# Type Alias: InvokeEndpointParams

> **InvokeEndpointParams** = `object`

Defined in: [types/providers.ts:1560](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1560)

Parameters for SageMaker endpoint invocation

## Properties

### EndpointName

> **EndpointName**: `string`

Defined in: [types/providers.ts:1562](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1562)

Endpoint name to invoke

---

### Body

> **Body**: `string` \| `Uint8Array`

Defined in: [types/providers.ts:1564](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1564)

Request body as string or Uint8Array

---

### ContentType?

> `optional` **ContentType?**: `string`

Defined in: [types/providers.ts:1566](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1566)

Content type of the request

---

### Accept?

> `optional` **Accept?**: `string`

Defined in: [types/providers.ts:1568](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1568)

Accept header for response format

---

### CustomAttributes?

> `optional` **CustomAttributes?**: `string`

Defined in: [types/providers.ts:1570](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1570)

Custom attributes for the request

---

### TargetModel?

> `optional` **TargetModel?**: `string`

Defined in: [types/providers.ts:1572](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1572)

Target model for multi-model endpoints

---

### TargetVariant?

> `optional` **TargetVariant?**: `string`

Defined in: [types/providers.ts:1574](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1574)

Target variant for A/B testing

---

### InferenceId?

> `optional` **InferenceId?**: `string`

Defined in: [types/providers.ts:1576](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1576)

Inference ID for request tracking

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/providers.ts:1586](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1586)

Cancels the in-flight HTTP request, not just the loop around it.

Named in camelCase deliberately: every other field here mirrors an AWS
`InvokeEndpointCommandInput` member and keeps its PascalCase, whereas this
one is a transport option handed to `client.send()` as
`@smithy/types` `HttpHandlerOptions` — it is never part of the command
payload, and spelling it differently keeps that boundary visible.
