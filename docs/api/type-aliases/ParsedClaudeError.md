[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:3435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3435)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:3436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3436)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:3437](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3437)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:3440](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3440)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
