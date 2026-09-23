[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:3532](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3532)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:3533](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3533)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:3534](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3534)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:3537](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3537)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
