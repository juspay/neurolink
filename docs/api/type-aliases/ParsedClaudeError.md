[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:3622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3622)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:3623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3623)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:3624](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3624)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:3627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3627)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
