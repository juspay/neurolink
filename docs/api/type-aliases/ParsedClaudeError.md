[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:3266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3266)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:3267](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3267)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:3268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3268)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:3271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3271)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
