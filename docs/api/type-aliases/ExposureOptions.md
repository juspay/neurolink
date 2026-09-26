[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExposureOptions

# Type Alias: ExposureOptions

> **ExposureOptions** = `object`

Options for exposing agents/workflows as MCP tools

## Properties

### prefix?

> `optional` **prefix?**: `string`

Prefix for tool names

---

### defaultAnnotations?

> `optional` **defaultAnnotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)

Default annotations for all exposed tools

---

### includeMetadataInDescription?

> `optional` **includeMetadataInDescription?**: `boolean`

Whether to include metadata in tool description

---

### nameTransformer?

> `optional` **nameTransformer?**: (`name`) => `string`

Custom name transformer

#### Parameters

##### name

`string`

#### Returns

`string`

---

### wrapWithContext?

> `optional` **wrapWithContext?**: `boolean`

Add execution context wrapper

---

### executionTimeout?

> `optional` **executionTimeout?**: `number`

Timeout for agent/workflow execution (ms)

---

### enableLogging?

> `optional` **enableLogging?**: `boolean`

Enable execution logging
