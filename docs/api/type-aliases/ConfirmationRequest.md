[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConfirmationRequest

# Type Alias: ConfirmationRequest

> **ConfirmationRequest** = `object`

Internal confirmation request tracking
Used by HITLManager to track pending confirmations

## Properties

### confirmationId

> **confirmationId**: `string`

Unique identifier for this confirmation request

---

### toolName

> **toolName**: `string`

Name of the tool requiring confirmation

---

### arguments

> **arguments**: `unknown`

Arguments that will be passed to the tool

---

### timestamp

> **timestamp**: `number`

Timestamp when the request was created

---

### timeoutHandle

> **timeoutHandle**: `NodeJS.Timeout`

Timeout handle for cleanup

---

### resolve

> **resolve**: (`result`) => `void`

Promise resolve function

#### Parameters

##### result

[`ConfirmationResult`](ConfirmationResult.md)

#### Returns

`void`

---

### reject

> **reject**: (`error`) => `void`

Promise reject function

#### Parameters

##### error

`Error`

#### Returns

`void`
