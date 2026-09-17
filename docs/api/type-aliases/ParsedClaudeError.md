[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:3284](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3284)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:3285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3285)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:3286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3286)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:3289](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3289)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
