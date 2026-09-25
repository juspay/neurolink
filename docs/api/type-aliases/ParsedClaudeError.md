[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:3620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3620)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:3621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3621)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:3622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3622)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:3625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3625)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
