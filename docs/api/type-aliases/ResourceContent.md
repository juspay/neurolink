[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResourceContent

# Type Alias: ResourceContent

> **ResourceContent** = `object`

Defined in: [types/mcp.ts:1948](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1948)

Resource content returned when reading a resource

## Properties

### uri

> **uri**: `string`

Defined in: [types/mcp.ts:1952](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1952)

Resource URI

---

### mimeType?

> `optional` **mimeType?**: `string`

Defined in: [types/mcp.ts:1957](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1957)

MIME type

---

### text?

> `optional` **text?**: `string`

Defined in: [types/mcp.ts:1962](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1962)

Text content (for text/\* MIME types)

---

### blob?

> `optional` **blob?**: `string`

Defined in: [types/mcp.ts:1967](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1967)

Binary content as base64 (for non-text MIME types)
