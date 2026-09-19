[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MarkdownHtmlElementNode

# Type Alias: MarkdownHtmlElementNode

> **MarkdownHtmlElementNode** = `object`

Defined in: [types/utilities.ts:368](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L368)

An element in the parsed HTML tree used for Markdown conversion.

## Properties

### kind

> **kind**: `"element"`

Defined in: [types/utilities.ts:369](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L369)

---

### tag

> **tag**: `string`

Defined in: [types/utilities.ts:371](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L371)

Lower-cased tag name.

---

### attrs

> **attrs**: `Record`\<`string`, `string`\>

Defined in: [types/utilities.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L373)

Lower-cased attribute names mapped to their decoded values.

---

### children

> **children**: [`MarkdownHtmlNode`](MarkdownHtmlNode.md)[]

Defined in: [types/utilities.ts:374](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L374)
