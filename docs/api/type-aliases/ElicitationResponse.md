[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationResponse

# Type Alias: ElicitationResponse

> **ElicitationResponse** = `object`

Defined in: [types/elicitation.ts:219](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L219)

Elicitation response

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/elicitation.ts:223](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L223)

Request ID this responds to

---

### responded

> **responded**: `boolean`

Defined in: [types/elicitation.ts:228](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L228)

Whether the user provided a response

---

### value?

> `optional` **value?**: [`JsonValue`](JsonValue.md)

Defined in: [types/elicitation.ts:233](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L233)

The user's response value

---

### cancelled?

> `optional` **cancelled?**: `boolean`

Defined in: [types/elicitation.ts:238](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L238)

Whether the request was cancelled

---

### timedOut?

> `optional` **timedOut?**: `boolean`

Defined in: [types/elicitation.ts:243](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L243)

Whether the request timed out

---

### error?

> `optional` **error?**: `string`

Defined in: [types/elicitation.ts:248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L248)

Error message if response failed

---

### timestamp

> **timestamp**: `number`

Defined in: [types/elicitation.ts:253](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L253)

Response timestamp
