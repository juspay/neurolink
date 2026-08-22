[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopChunk

# Type Alias: AgenticLoopChunk

> **AgenticLoopChunk** = `object`

Defined in: [types/loopEngine.ts:20](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L20)

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

Defined in: [types/loopEngine.ts:21](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L21)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/loopEngine.ts:22](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L22)
