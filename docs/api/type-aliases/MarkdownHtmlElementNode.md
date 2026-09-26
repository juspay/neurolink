[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MarkdownHtmlElementNode

# Type Alias: MarkdownHtmlElementNode

> **MarkdownHtmlElementNode** = `object`

An element in the parsed HTML tree used for Markdown conversion.

## Properties

### kind

> **kind**: `"element"`

---

### tag

> **tag**: `string`

Lower-cased tag name.

---

### attrs

> **attrs**: `Record`\<`string`, `string`\>

Lower-cased attribute names mapped to their decoded values.

---

### children

> **children**: [`MarkdownHtmlNode`](MarkdownHtmlNode.md)[]
