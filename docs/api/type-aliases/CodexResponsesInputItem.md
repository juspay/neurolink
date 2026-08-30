[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexResponsesInputItem

# Type Alias: CodexResponsesInputItem

> **CodexResponsesInputItem** = \{ `role`: `"user"` \| `"assistant"`; `content`: [`CodexContentPart`](CodexContentPart.md)[]; \} \| \{ `type`: `"function_call"`; `call_id`: `string`; `name`: `string`; `arguments`: `string`; \} \| \{ `type`: `"function_call_output"`; `call_id`: `string`; `output`: `string`; \}

Defined in: [types/codex.ts:120](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L120)

A single item in a Codex Responses request.
