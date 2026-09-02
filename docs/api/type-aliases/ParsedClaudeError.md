[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:2929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2929)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2930)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:2931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2931)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2934)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
