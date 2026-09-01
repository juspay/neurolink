[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPResource

# Type Alias: MCPResource

> **MCPResource** = `object`

Defined in: [types/mcp.ts:1917](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1917)

MCP Resource definition

## Properties

### uri

> **uri**: `string`

Defined in: [types/mcp.ts:1921](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1921)

Unique resource URI

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1926](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1926)

Human-readable name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:1931](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1931)

Resource description

---

### mimeType?

> `optional` **mimeType?**: `string`

Defined in: [types/mcp.ts:1936](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1936)

MIME type of the resource content

---

### size?

> `optional` **size?**: `number`

Defined in: [types/mcp.ts:1941](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1941)

Resource size in bytes (if known)

---

### dynamic?

> `optional` **dynamic?**: `boolean`

Defined in: [types/mcp.ts:1946](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1946)

Whether the resource content can change

---

### annotations?

> `optional` **annotations?**: `object`

Defined in: [types/mcp.ts:1951](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1951)

Resource annotations/metadata

#### audience?

> `optional` **audience?**: `string`[]

Audience description

#### priority?

> `optional` **priority?**: `number`

Priority hint (0-1)
