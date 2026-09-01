[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResourceContent

# Type Alias: ResourceContent

> **ResourceContent** = `object`

Defined in: [types/mcp.ts:1967](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1967)

Resource content returned when reading a resource

## Properties

### uri

> **uri**: `string`

Defined in: [types/mcp.ts:1971](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1971)

Resource URI

---

### mimeType?

> `optional` **mimeType?**: `string`

Defined in: [types/mcp.ts:1976](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1976)

MIME type

---

### text?

> `optional` **text?**: `string`

Defined in: [types/mcp.ts:1981](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1981)

Text content (for text/\* MIME types)

---

### blob?

> `optional` **blob?**: `string`

Defined in: [types/mcp.ts:1986](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1986)

Binary content as base64 (for non-text MIME types)
