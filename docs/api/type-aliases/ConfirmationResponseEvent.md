[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConfirmationResponseEvent

# Type Alias: ConfirmationResponseEvent

> **ConfirmationResponseEvent** = `object`

Defined in: [types/hitl.ts:151](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/hitl.ts#L151)

Event payload for confirmation responses
Sent from frontends back to HITLManager with user decision

## Properties

### type

> **type**: `"hitl:confirmation-response"`

Defined in: [types/hitl.ts:152](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/hitl.ts#L152)

---

### payload

> **payload**: `object`

Defined in: [types/hitl.ts:153](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/hitl.ts#L153)

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
