[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPResource

# Type Alias: MCPResource

> **MCPResource** = `object`

Defined in: [types/mcp.ts:1936](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1936)

MCP Resource definition

## Properties

### uri

> **uri**: `string`

Defined in: [types/mcp.ts:1940](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1940)

Unique resource URI

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1945](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1945)

Human-readable name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:1950](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1950)

Resource description

---

### mimeType?

> `optional` **mimeType?**: `string`

Defined in: [types/mcp.ts:1955](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1955)

MIME type of the resource content

---

### size?

> `optional` **size?**: `number`

Defined in: [types/mcp.ts:1960](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1960)

Resource size in bytes (if known)

---

### dynamic?

> `optional` **dynamic?**: `boolean`

Defined in: [types/mcp.ts:1965](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1965)

Whether the resource content can change

---

### annotations?

> `optional` **annotations?**: `object`

Defined in: [types/mcp.ts:1970](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1970)

Resource annotations/metadata

#### audience?

> `optional` **audience?**: `string`[]

Audience description

#### priority?

> `optional` **priority?**: `number`

Priority hint (0-1)
