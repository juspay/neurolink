[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConfirmationResponseEvent

# Type Alias: ConfirmationResponseEvent

> **ConfirmationResponseEvent** = `object`

Defined in: [types/hitl.ts:151](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L151)

Event payload for confirmation responses
Sent from frontends back to HITLManager with user decision

## Properties

### type

> **type**: `"hitl:confirmation-response"`

Defined in: [types/hitl.ts:152](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L152)

---

### payload

> **payload**: `object`

Defined in: [types/hitl.ts:153](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L153)

#### confirmationId

> **confirmationId**: `string`

Matching confirmation ID from the request

#### approved

> **approved**: `boolean`

User's approval decision

#### reason?

> `optional` **reason?**: `string`

Optional reason for rejection

#### modifiedArguments?

> `optional` **modifiedArguments?**: `unknown`

User-edited parameters (if modification allowed)

#### metadata

> **metadata**: `object`

Response metadata

##### metadata.timestamp

> **timestamp**: `string`

ISO timestamp when user responded

##### metadata.responseTime

> **responseTime**: `number`

Time taken to respond in milliseconds

##### metadata.userId?

> `optional` **userId?**: `string`

User who made the decision
