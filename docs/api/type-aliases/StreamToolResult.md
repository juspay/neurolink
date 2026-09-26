[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamToolResult

# Type Alias: StreamToolResult

> **StreamToolResult** = `object`

Type for tool execution results - Enhanced for type safety

## Properties

### toolName

> **toolName**: `string`

---

### status

> **status**: `"success"` \| `"failure"`

---

### output?

> `optional` **output?**: [`JsonValue`](JsonValue.md)

---

### error?

> `optional` **error?**: `string`

---

### id?

> `optional` **id?**: `string`

---

### executionTime?

> `optional` **executionTime?**: `number`

---

### metadata?

> `optional` **metadata?**: `object` & `object`

#### Type Declaration

##### serverId?

> `optional` **serverId?**: `string`

##### toolCategory?

> `optional` **toolCategory?**: `string`

##### isExternal?

> `optional` **isExternal?**: `boolean`
