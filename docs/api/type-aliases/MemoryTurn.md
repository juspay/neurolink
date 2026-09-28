[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MemoryTurn

# Type Alias: MemoryTurn

> **MemoryTurn** = `object`

One completed turn as seen by the memory write hooks. `usage`,
`finishReason` and `toolsUsed` are best-effort: the generate path has the
full result, the stream path only knows the provider, the accumulated
text and which tools started.

## Properties

### prompt

> **prompt**: `string`

The caller's original prompt, before memory context was prepended.

---

### response

> **response**: `string`

The assistant's final text, trimmed.

---

### userId

> **userId**: `string`

Primary memory owner — `context.userId`.

---

### sessionId?

> `optional` **sessionId?**: `string`

`context.sessionId`, when the call carried one.

---

### provider?

> `optional` **provider?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

Names of tools that ran during the turn.

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Token usage — generate path only.

---

### finishReason?

> `optional` **finishReason?**: `string`

Provider finish reason — generate path only.
