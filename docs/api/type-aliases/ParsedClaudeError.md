[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ParsedClaudeError

# Type Alias: ParsedClaudeError

> **ParsedClaudeError** = `object`

Defined in: [types/proxy.ts:2830](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2830)

Parsed shape of a Claude API error body.

## Properties

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:2831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2831)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:2832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2832)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:2835](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2835)

`error.details.error_code`, e.g. "oauth_not_allowed_for_organization".
Absent on payloads that carry no details object.
