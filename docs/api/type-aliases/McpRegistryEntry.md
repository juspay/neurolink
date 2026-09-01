[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpRegistryEntry

# Type Alias: McpRegistryEntry

> **McpRegistryEntry** = `object`

Defined in: [types/mcp.ts:1525](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1525)

Registry entry for an MCP server

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:1529](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1529)

Unique identifier

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1534](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1534)

Server name

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:1539](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1539)

Server description

---

### version

> **version**: `string`

Defined in: [types/mcp.ts:1544](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1544)

Server version

---

### author?

> `optional` **author?**: `string`

Defined in: [types/mcp.ts:1549](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1549)

Author or maintainer

---

### license?

> `optional` **license?**: `string`

Defined in: [types/mcp.ts:1554](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1554)

License

---

### homepage?

> `optional` **homepage?**: `string`

Defined in: [types/mcp.ts:1559](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1559)

Homepage URL

---

### repository?

> `optional` **repository?**: `string`

Defined in: [types/mcp.ts:1564](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1564)

Repository URL

---

### npmPackage?

> `optional` **npmPackage?**: `string`

Defined in: [types/mcp.ts:1569](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1569)

NPM package name (if applicable)

---

### installCommand?

> `optional` **installCommand?**: `string`

Defined in: [types/mcp.ts:1574](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1574)

Installation command

---

### command?

> `optional` **command?**: `string`

Defined in: [types/mcp.ts:1579](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1579)

Command to run the server

---

### args?

> `optional` **args?**: `string`[]

Defined in: [types/mcp.ts:1584](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1584)

Command arguments

---

### requiredEnvVars?

> `optional` **requiredEnvVars?**: `string`[]

Defined in: [types/mcp.ts:1589](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1589)

Required environment variables

---

### transports?

> `optional` **transports?**: [`MCPTransportType`](MCPTransportType.md)[]

Defined in: [types/mcp.ts:1594](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1594)

Supported transport types

---

### categories?

> `optional` **categories?**: `string`[]

Defined in: [types/mcp.ts:1599](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1599)

Server categories

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/mcp.ts:1604](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1604)

Server tags

---

### tools?

> `optional` **tools?**: `string`[]

Defined in: [types/mcp.ts:1609](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1609)

Tool names provided by the server

---

### downloads?

> `optional` **downloads?**: `number`

Defined in: [types/mcp.ts:1614](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1614)

Download count (popularity metric)

---

### stars?

> `optional` **stars?**: `number`

Defined in: [types/mcp.ts:1619](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1619)

Star count (if from GitHub)

---

### lastUpdated?

> `optional` **lastUpdated?**: `string`

Defined in: [types/mcp.ts:1624](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1624)

Last updated date

---

### verified?

> `optional` **verified?**: `boolean`

Defined in: [types/mcp.ts:1629](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1629)

Verification status

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1634](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1634)

Custom metadata
