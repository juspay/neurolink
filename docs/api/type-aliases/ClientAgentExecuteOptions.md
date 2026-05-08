[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientAgentExecuteOptions

# Type Alias: ClientAgentExecuteOptions

> **ClientAgentExecuteOptions** = `object`

Defined in: [types/client.ts:296](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L296)

Agent execution options

## Properties

### agentId

> **agentId**: `string`

Defined in: [types/client.ts:298](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L298)

Agent ID

---

### input

> **input**: `string`

Defined in: [types/client.ts:300](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L300)

Input message

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/client.ts:302](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L302)

Session ID for conversation continuity

---

### context?

> `optional` **context?**: [`UnknownRecord`](UnknownRecord.md)

Defined in: [types/client.ts:304](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L304)

User context

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/client.ts:306](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L306)

Stream the response

---

### tools?

> `optional` **tools?**: `object`

Defined in: [types/client.ts:308](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L308)

Tool execution options

#### enabled?

> `optional` **enabled?**: `string`[]

Enabled tools

#### disabled?

> `optional` **disabled?**: `string`[]

Disabled tools

#### mode?

> `optional` **mode?**: `"auto"` \| `"manual"` \| `"confirm"`

Tool execution mode
