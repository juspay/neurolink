[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationRequest

# Type Alias: ElicitationRequest

> **ElicitationRequest** = `object`

Defined in: [types/elicitation.ts:28](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L28)

Base elicitation request

## Properties

### id

> **id**: `string`

Defined in: [types/elicitation.ts:32](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L32)

Unique request identifier

---

### type

> **type**: [`ElicitationType`](ElicitationType.md)

Defined in: [types/elicitation.ts:37](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L37)

Type of elicitation

---

### message

> **message**: `string`

Defined in: [types/elicitation.ts:42](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L42)

Message to display to user

---

### toolName

> **toolName**: `string`

Defined in: [types/elicitation.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L47)

Tool requesting the elicitation

---

### serverId?

> `optional` **serverId?**: `string`

Defined in: [types/elicitation.ts:52](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L52)

Server ID of the requesting tool

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/elicitation.ts:57](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L57)

Request timeout in milliseconds

---

### optional?

> `optional` **optional?**: `boolean`

Defined in: [types/elicitation.ts:62](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L62)

Whether the request can be skipped

---

### defaultValue?

> `optional` **defaultValue?**: [`JsonValue`](JsonValue.md)

Defined in: [types/elicitation.ts:67](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L67)

Default value if skipped or timed out

---

### context?

> `optional` **context?**: [`JsonObject`](JsonObject.md)

Defined in: [types/elicitation.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L72)

Additional context for the request
