[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexResponsesInputItem

# Type Alias: CodexResponsesInputItem

> **CodexResponsesInputItem** = \{ `role`: `"user"` \| `"assistant"`; `content`: [`CodexContentPart`](CodexContentPart.md)[]; \} \| \{ `type`: `"function_call"`; `call_id`: `string`; `name`: `string`; `arguments`: `string`; \} \| \{ `type`: `"function_call_output"`; `call_id`: `string`; `output`: `string`; \}

A single item in a Codex Responses request.
