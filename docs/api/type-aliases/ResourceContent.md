[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResourceContent

# Type Alias: ResourceContent

> **ResourceContent** = `object`

Defined in: [types/mcp.ts:1986](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1986)

Resource content returned when reading a resource

## Properties

### uri

> **uri**: `string`

Defined in: [types/mcp.ts:1990](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1990)

Resource URI

---

### mimeType?

> `optional` **mimeType?**: `string`

Defined in: [types/mcp.ts:1995](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1995)

MIME type

---

### text?

> `optional` **text?**: `string`

Defined in: [types/mcp.ts:2000](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2000)

Text content (for text/\* MIME types)

---

### blob?

> `optional` **blob?**: `string`

Defined in: [types/mcp.ts:2005](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2005)

Binary content as base64 (for non-text MIME types)
