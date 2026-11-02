[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationErasureWriteContext

# Type Alias: ConversationErasureWriteContext

> **ConversationErasureWriteContext** = \{ `mode`: `"legacy"`; `reason`: `string`; `strict`: `false`; \} \| \{ `mode`: `"fenced"`; `strict`: `boolean`; `runId`: `string`; `epoch`: `string`; `evictedKeys`: `string`; `evictionPolicy`: `"noeviction"`; \}

What a Redis conversation writer resolved at initialization.
`legacy` keeps the ordinary storage behaviour and cannot erase permanently;
`fenced` binds every write to the server run id, store epoch and eviction
counter observed at initialization.
