[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpRegistryEntry

# Type Alias: McpRegistryEntry

> **McpRegistryEntry** = `object`

Registry entry for an MCP server

## Properties

### id

> **id**: `string`

Unique identifier

---

### name

> **name**: `string`

Server name

---

### description

> **description**: `string`

Server description

---

### version

> **version**: `string`

Server version

---

### author?

> `optional` **author?**: `string`

Author or maintainer

---

### license?

> `optional` **license?**: `string`

License

---

### homepage?

> `optional` **homepage?**: `string`

Homepage URL

---

### repository?

> `optional` **repository?**: `string`

Repository URL

---

### npmPackage?

> `optional` **npmPackage?**: `string`

NPM package name (if applicable)

---

### installCommand?

> `optional` **installCommand?**: `string`

Installation command

---

### command?

> `optional` **command?**: `string`

Command to run the server

---

### args?

> `optional` **args?**: `string`[]

Command arguments

---

### requiredEnvVars?

> `optional` **requiredEnvVars?**: `string`[]

Required environment variables

---

### transports?

> `optional` **transports?**: [`MCPTransportType`](MCPTransportType.md)[]

Supported transport types

---

### categories?

> `optional` **categories?**: `string`[]

Server categories

---

### tags?

> `optional` **tags?**: `string`[]

Server tags

---

### tools?

> `optional` **tools?**: `string`[]

Tool names provided by the server

---

### downloads?

> `optional` **downloads?**: `number`

Download count (popularity metric)

---

### stars?

> `optional` **stars?**: `number`

Star count (if from GitHub)

---

### lastUpdated?

> `optional` **lastUpdated?**: `string`

Last updated date

---

### verified?

> `optional` **verified?**: `boolean`

Verification status

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Custom metadata
