[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConfirmationRequestEvent

# Type Alias: ConfirmationRequestEvent

> **ConfirmationRequestEvent** = `object`

Defined in: [types/hitl.ts:106](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L106)

Event payload for confirmation requests
Sent to frontends via EventEmitter when tool needs approval

## Properties

### type

> **type**: `"hitl:confirmation-request"`

Defined in: [types/hitl.ts:107](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L107)

---

### payload

> **payload**: `object`

Defined in: [types/hitl.ts:108](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L108)

#### confirmationId

> **confirmationId**: `string`

Unique ID for tracking this request

#### toolName

> **toolName**: `string`

Name of the tool requiring confirmation

#### serverId?

> `optional` **serverId?**: `string`

MCP server ID (if this is an external tool)

#### actionType

> **actionType**: `string`

Human-readable description of the action

#### arguments

> **arguments**: `unknown`

Tool parameters for user review

#### metadata

> **metadata**: `object`

Additional metadata about the request

##### metadata.timestamp

> **timestamp**: `string`

ISO timestamp when request was created

##### metadata.sessionId?

> `optional` **sessionId?**: `string`

User session identifier

##### metadata.userId?

> `optional` **userId?**: `string`

User identifier

##### metadata.dangerousKeywords

> **dangerousKeywords**: `string`[]

Keywords that triggered HITL

#### timeoutMs

> **timeoutMs**: `number`

Confirmation timeout in milliseconds

#### allowModification

> **allowModification**: `boolean`

Whether user can modify arguments
