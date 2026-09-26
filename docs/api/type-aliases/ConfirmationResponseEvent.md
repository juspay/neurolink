[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConfirmationResponseEvent

# Type Alias: ConfirmationResponseEvent

> **ConfirmationResponseEvent** = `object`

Event payload for confirmation responses
Sent from frontends back to HITLManager with user decision

## Properties

### type

> **type**: `"hitl:confirmation-response"`

---

### payload

> **payload**: `object`

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
