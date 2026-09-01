[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpRegistryEntry

# Type Alias: McpRegistryEntry

> **McpRegistryEntry** = `object`

Defined in: [types/mcp.ts:1544](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1544)

Registry entry for an MCP server

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:1548](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1548)

Unique identifier

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1553](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1553)

Server name

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:1558](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1558)

Server description

---

### version

> **version**: `string`

Defined in: [types/mcp.ts:1563](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1563)

Server version

---

### author?

> `optional` **author?**: `string`

Defined in: [types/mcp.ts:1568](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1568)

Author or maintainer

---

### license?

> `optional` **license?**: `string`

Defined in: [types/mcp.ts:1573](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1573)

License

---

### homepage?

> `optional` **homepage?**: `string`

Defined in: [types/mcp.ts:1578](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1578)

Homepage URL

---

### repository?

> `optional` **repository?**: `string`

Defined in: [types/mcp.ts:1583](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1583)

Repository URL

---

### npmPackage?

> `optional` **npmPackage?**: `string`

Defined in: [types/mcp.ts:1588](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1588)

NPM package name (if applicable)

---

### installCommand?

> `optional` **installCommand?**: `string`

Defined in: [types/mcp.ts:1593](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1593)

Installation command

---

### command?

> `optional` **command?**: `string`

Defined in: [types/mcp.ts:1598](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1598)

Command to run the server

---

### args?

> `optional` **args?**: `string`[]

Defined in: [types/mcp.ts:1603](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1603)

Command arguments

---

### requiredEnvVars?

> `optional` **requiredEnvVars?**: `string`[]

Defined in: [types/mcp.ts:1608](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1608)

Required environment variables

---

### transports?

> `optional` **transports?**: [`MCPTransportType`](MCPTransportType.md)[]

Defined in: [types/mcp.ts:1613](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1613)

Supported transport types

---

### categories?

> `optional` **categories?**: `string`[]

Defined in: [types/mcp.ts:1618](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1618)

Server categories

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/mcp.ts:1623](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1623)

Server tags

---

### tools?

> `optional` **tools?**: `string`[]

Defined in: [types/mcp.ts:1628](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1628)

Tool names provided by the server

---

### downloads?

> `optional` **downloads?**: `number`

Defined in: [types/mcp.ts:1633](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1633)

Download count (popularity metric)

---

### stars?

> `optional` **stars?**: `number`

Defined in: [types/mcp.ts:1638](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1638)

Star count (if from GitHub)

---

### lastUpdated?

> `optional` **lastUpdated?**: `string`

Defined in: [types/mcp.ts:1643](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1643)

Last updated date

---

### verified?

> `optional` **verified?**: `boolean`

Defined in: [types/mcp.ts:1648](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1648)

Verification status

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1653](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1653)

Custom metadata
