[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexNativeToolKind

# Type Alias: CodexNativeToolKind

> **CodexNativeToolKind** = `"function"` \| `"custom"`

A declared tool's own kind, independent of its namespace. Claude's
`tool_use` block carries only `name` + `input`, with no such discriminator,
so response serialization threads a name -> kind map (built while flattening
`additional_tools` on the request side) to decide whether a tool_use's
`input` is a real JSON-Schema-shaped object (`function`) or the single
grammar-constrained string a custom tool was wrapped into (`custom`).
