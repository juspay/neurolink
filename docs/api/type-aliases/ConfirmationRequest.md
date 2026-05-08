[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConfirmationRequest

# Type Alias: ConfirmationRequest

> **ConfirmationRequest** = `object`

Defined in: [types/hitl.ts:61](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L61)

Internal confirmation request tracking
Used by HITLManager to track pending confirmations

## Properties

### confirmationId

> **confirmationId**: `string`

Defined in: [types/hitl.ts:63](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L63)

Unique identifier for this confirmation request

---

### toolName

> **toolName**: `string`

Defined in: [types/hitl.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L66)

Name of the tool requiring confirmation

---

### arguments

> **arguments**: `unknown`

Defined in: [types/hitl.ts:69](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L69)

Arguments that will be passed to the tool

---

### timestamp

> **timestamp**: `number`

Defined in: [types/hitl.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L72)

Timestamp when the request was created

---

### timeoutHandle

> **timeoutHandle**: `NodeJS.Timeout`

Defined in: [types/hitl.ts:75](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L75)

Timeout handle for cleanup

---

### resolve

> **resolve**: (`result`) => `void`

Defined in: [types/hitl.ts:78](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L78)

Promise resolve function

#### Parameters

##### result

[`ConfirmationResult`](ConfirmationResult.md)

#### Returns

`void`

---

### reject

> **reject**: (`error`) => `void`

Defined in: [types/hitl.ts:81](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L81)

Promise reject function

#### Parameters

##### error

`Error`

#### Returns

`void`
