[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

---

### message?

> `optional` **message?**: `string`

---

### errorCode?

> `optional` **errorCode?**: `string`

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
