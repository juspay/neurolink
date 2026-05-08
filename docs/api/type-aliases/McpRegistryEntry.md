[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpRegistryEntry

# Type Alias: McpRegistryEntry

> **McpRegistryEntry** = `object`

Defined in: [types/mcp.ts:1506](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1506)

Registry entry for an MCP server

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:1510](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1510)

Unique identifier

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1515](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1515)

Server name

---

### description

> **description**: `string`

Defined in: [types/mcp.ts:1520](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1520)

Server description

---

### version

> **version**: `string`

Defined in: [types/mcp.ts:1525](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1525)

Server version

---

### author?

> `optional` **author?**: `string`

Defined in: [types/mcp.ts:1530](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1530)

Author or maintainer

---

### license?

> `optional` **license?**: `string`

Defined in: [types/mcp.ts:1535](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1535)

License

---

### homepage?

> `optional` **homepage?**: `string`

Defined in: [types/mcp.ts:1540](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1540)

Homepage URL

---

### repository?

> `optional` **repository?**: `string`

Defined in: [types/mcp.ts:1545](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1545)

Repository URL

---

### npmPackage?

> `optional` **npmPackage?**: `string`

Defined in: [types/mcp.ts:1550](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1550)

NPM package name (if applicable)

---

### installCommand?

> `optional` **installCommand?**: `string`

Defined in: [types/mcp.ts:1555](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1555)

Installation command

---

### command?

> `optional` **command?**: `string`

Defined in: [types/mcp.ts:1560](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1560)

Command to run the server

---

### args?

> `optional` **args?**: `string`[]

Defined in: [types/mcp.ts:1565](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1565)

Command arguments

---

### requiredEnvVars?

> `optional` **requiredEnvVars?**: `string`[]

Defined in: [types/mcp.ts:1570](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1570)

Required environment variables

---

### transports?

> `optional` **transports?**: [`MCPTransportType`](MCPTransportType.md)[]

Defined in: [types/mcp.ts:1575](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1575)

Supported transport types

---

### categories?

> `optional` **categories?**: `string`[]

Defined in: [types/mcp.ts:1580](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1580)

Server categories

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/mcp.ts:1585](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1585)

Server tags

---

### tools?

> `optional` **tools?**: `string`[]

Defined in: [types/mcp.ts:1590](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1590)

Tool names provided by the server

---

### downloads?

> `optional` **downloads?**: `number`

Defined in: [types/mcp.ts:1595](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1595)

Download count (popularity metric)

---

### stars?

> `optional` **stars?**: `number`

Defined in: [types/mcp.ts:1600](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1600)

Star count (if from GitHub)

---

### lastUpdated?

> `optional` **lastUpdated?**: `string`

Defined in: [types/mcp.ts:1605](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1605)

Last updated date

---

### verified?

> `optional` **verified?**: `boolean`

Defined in: [types/mcp.ts:1610](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1610)

Verification status

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Defined in: [types/mcp.ts:1615](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1615)

Custom metadata
