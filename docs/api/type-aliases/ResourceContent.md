[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResourceContent

# Type Alias: ResourceContent

> **ResourceContent** = `object`

Defined in: [types/mcp.ts:1948](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1948)

Resource content returned when reading a resource

## Properties

### uri

> **uri**: `string`

Defined in: [types/mcp.ts:1952](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1952)

Resource URI

---

### mimeType?

> `optional` **mimeType?**: `string`

Defined in: [types/mcp.ts:1957](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1957)

MIME type

---

### text?

> `optional` **text?**: `string`

Defined in: [types/mcp.ts:1962](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1962)

Text content (for text/\* MIME types)

---

### blob?

> `optional` **blob?**: `string`

Defined in: [types/mcp.ts:1967](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1967)

Binary content as base64 (for non-text MIME types)
