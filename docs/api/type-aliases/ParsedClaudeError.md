[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:2944](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2944)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2945](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2945)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:2946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2946)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2949)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
