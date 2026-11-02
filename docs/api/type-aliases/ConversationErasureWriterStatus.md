[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationErasureWriterStatus

# Type Alias: ConversationErasureWriterStatus

> **ConversationErasureWriterStatus** = \{ `status`: `"unsupported"`; `protocol`: [`ConversationErasureProtocol`](ConversationErasureProtocol.md); `strict`: `boolean`; `reason`: `string`; \} \| \{ `status`: `"participating"`; `strict`: `boolean`; `backend`: `"redis-standalone"`; `protocol`: [`ConversationErasureProtocol`](ConversationErasureProtocol.md); `serverRunIdDigest`: `string`; `storeEpochDigest`: `string`; `evictionPolicy`: `"noeviction"`; `evictionCounter`: `number`; \}

Whether this writer participates in the v1 erasure fence.
