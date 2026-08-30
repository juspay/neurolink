[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:2907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2907)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2908)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:2909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2909)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2912](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2912)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
