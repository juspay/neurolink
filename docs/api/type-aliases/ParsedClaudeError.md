[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:3305](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3305)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:3306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3306)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:3307](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3307)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:3310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3310)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
