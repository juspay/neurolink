[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopChunk

# Type Alias: AgenticLoopChunk

> **AgenticLoopChunk** = `object`

One chunk on the engine's stream.

`reasoning` is carried alongside `content` rather than instead of it: the
providers that emit extended thinking (direct Anthropic, Google AI Studio,
Vertex) push a chunk with empty `content` and the thinking delta in
`reasoning`, so a channel typed `{ content: string }` alone would drop
every thinking delta the moment those providers move onto the engine —
silently, since the text path would keep working.

## Properties

### content

> **content**: `string`

---

### reasoning?

> `optional` **reasoning?**: `string`
