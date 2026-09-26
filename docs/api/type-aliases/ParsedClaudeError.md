[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:3682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3682)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:3683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3683)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:3684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3684)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:3687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3687)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
