[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:3555](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3555)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:3556](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3556)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:3557](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3557)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:3560](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3560)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
