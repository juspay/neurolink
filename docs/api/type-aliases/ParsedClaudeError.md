[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:2938](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2938)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2939](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2939)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:2940](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2940)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2943)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
