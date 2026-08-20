[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:2840](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2840)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2841](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2841)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:2842](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2842)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2845](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2845)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
