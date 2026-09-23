[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:3552](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3552)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:3553](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3553)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:3554](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3554)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:3557](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3557)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
