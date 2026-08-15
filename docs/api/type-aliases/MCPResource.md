[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPResource

# Type Alias: MCPResource

> **MCPResource** = `object`

Defined in: [types/mcp.ts:1898](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L1898)

MCP Resource definition

## Properties

### uri

> **uri**: `string`

Defined in: [types/mcp.ts:1902](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L1902)

Unique resource URI

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1907](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L1907)

Human-readable name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:1912](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L1912)

Resource description

---

### mimeType?

> `optional` **mimeType?**: `string`

Defined in: [types/mcp.ts:1917](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L1917)

MIME type of the resource content

---

### size?

> `optional` **size?**: `number`

Defined in: [types/mcp.ts:1922](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L1922)

Resource size in bytes (if known)

---

### dynamic?

> `optional` **dynamic?**: `boolean`

Defined in: [types/mcp.ts:1927](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L1927)

Whether the resource content can change

---

### annotations?

> `optional` **annotations?**: `object`

Defined in: [types/mcp.ts:1932](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/mcp.ts#L1932)

Resource annotations/metadata

#### audience?

> `optional` **audience?**: `string`[]

Audience description

#### priority?

> `optional` **priority?**: `number`

Priority hint (0-1)
