[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamToolResult

# Type Alias: StreamToolResult

> **StreamToolResult** = `object`

Defined in: [types/stream.ts:92](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L92)

Type for tool execution results - Enhanced for type safety

## Properties

### toolName

> **toolName**: `string`

Defined in: [types/stream.ts:93](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L93)

---

### status

> **status**: `"success"` \| `"failure"`

Defined in: [types/stream.ts:94](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L94)

---

### output?

> `optional` **output?**: [`JsonValue`](JsonValue.md)

Defined in: [types/stream.ts:95](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L95)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/stream.ts:96](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L96)

---

### id?

> `optional` **id?**: `string`

Defined in: [types/stream.ts:97](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L97)

---

### executionTime?

> `optional` **executionTime?**: `number`

Defined in: [types/stream.ts:98](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L98)

---

### metadata?

> `optional` **metadata?**: `object` & `object`

Defined in: [types/stream.ts:99](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L99)

#### Type Declaration

##### serverId?

> `optional` **serverId?**: `string`

##### toolCategory?

> `optional` **toolCategory?**: `string`

##### isExternal?

> `optional` **isExternal?**: `boolean`
