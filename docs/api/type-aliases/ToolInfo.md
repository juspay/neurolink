[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolInfo

# Type Alias: ToolInfo

> **ToolInfo** = `object`

Defined in: [types/tools.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L102)

Tool information with extensibility
Moved from src/lib/mcp/contracts/mcpContract.ts

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### name

> **name**: `string`

Defined in: [types/tools.ts:103](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L103)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/tools.ts:104](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L104)

---

### category?

> `optional` **category?**: `string`

Defined in: [types/tools.ts:105](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L105)

---

### serverId?

> `optional` **serverId?**: `string`

Defined in: [types/tools.ts:106](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L106)

---

### inputSchema?

> `optional` **inputSchema?**: [`StandardRecord`](StandardRecord.md)

Defined in: [types/tools.ts:107](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L107)

---

### outputSchema?

> `optional` **outputSchema?**: [`StandardRecord`](StandardRecord.md)

Defined in: [types/tools.ts:108](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L108)

---

### annotations?

> `optional` **annotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)

Defined in: [types/tools.ts:110](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L110)

MCP tool annotations (safety hints, metadata). Auto-inferred when mcp.annotations.autoInfer is enabled.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/tools.ts:112](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L112)

Per-tool timeout in milliseconds, set at registration time

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/tools.ts:113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L113)
