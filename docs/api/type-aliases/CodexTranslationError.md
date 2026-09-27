[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexTranslationError

# Type Alias: CodexTranslationError

> **CodexTranslationError** = \{ `code`: `"MALFORMED_REQUEST"`; `message`: `string`; \} \| \{ `code`: `"SUSPECTED_PARTIAL_HISTORY"`; `message`: `string`; \} \| \{ `code`: `"UNTRANSLATABLE_REQUEST"`; `message`: `string`; \}

A `parseCodexNativeRequest`/`translateCodexRequestToClaude` failure. Never thrown.
`UNTRANSLATABLE_REQUEST` is a request Codex itself accepts but Anthropic would
reject, as opposed to one that is invalid on the Codex wire.
