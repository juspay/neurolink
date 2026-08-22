[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamToolResult

# Type Alias: StreamToolResult

> **StreamToolResult** = `object`

Defined in: [types/stream.ts:103](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L103)

Type for tool execution results - Enhanced for type safety

## Properties

### toolName

> **toolName**: `string`

Defined in: [types/stream.ts:104](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L104)

---

### status

> **status**: `"success"` \| `"failure"`

Defined in: [types/stream.ts:105](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L105)

---

### output?

> `optional` **output?**: [`JsonValue`](JsonValue.md)

Defined in: [types/stream.ts:106](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L106)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/stream.ts:107](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L107)

---

### id?

> `optional` **id?**: `string`

Defined in: [types/stream.ts:108](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L108)

---

### executionTime?

> `optional` **executionTime?**: `number`

Defined in: [types/stream.ts:109](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L109)

---

### metadata?

> `optional` **metadata?**: `object` & `object`

Defined in: [types/stream.ts:110](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L110)

#### Type Declaration

##### serverId?

> `optional` **serverId?**: `string`

##### toolCategory?

> `optional` **toolCategory?**: `string`

##### isExternal?

> `optional` **isExternal?**: `boolean`
