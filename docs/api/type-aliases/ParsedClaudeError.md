[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:2958](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2958)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2959](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2959)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:2960](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2960)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2963](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2963)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
