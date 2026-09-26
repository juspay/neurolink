[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamToolResult

# Type Alias: StreamToolResult

> **StreamToolResult** = `object`

Defined in: [types/stream.ts:112](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L112)

Type for tool execution results - Enhanced for type safety

## Properties

### toolName

> **toolName**: `string`

Defined in: [types/stream.ts:113](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L113)

---

### status

> **status**: `"success"` \| `"failure"`

Defined in: [types/stream.ts:114](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L114)

---

### output?

> `optional` **output?**: [`JsonValue`](JsonValue.md)

Defined in: [types/stream.ts:115](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L115)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/stream.ts:116](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L116)

---

### id?

> `optional` **id?**: `string`

Defined in: [types/stream.ts:117](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L117)

---

### executionTime?

> `optional` **executionTime?**: `number`

Defined in: [types/stream.ts:118](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L118)

---

### metadata?

> `optional` **metadata?**: `object` & `object`

Defined in: [types/stream.ts:119](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L119)

#### Type Declaration

##### serverId?

> `optional` **serverId?**: `string`

##### toolCategory?

> `optional` **toolCategory?**: `string`

##### isExternal?

> `optional` **isExternal?**: `boolean`
