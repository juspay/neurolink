[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicEntitlementFailure

# Type Alias: AnthropicEntitlementFailure

> **AnthropicEntitlementFailure** = `object`

Defined in: [types/proxy.ts:3637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3637)

Accounts rejected by an organization/plan entitlement policy during a single
request. Anthropic answers such an account with a `permission_error` that no
amount of retrying or token refreshing can fix, but which a _different_
account may not hit at all — so it drives rotation, and is reported to the
client only once every account has been tried.

## Properties

### status

> **status**: `number`

Defined in: [types/proxy.ts:3638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3638)

---

### accounts

> **accounts**: `string`[]

Defined in: [types/proxy.ts:3640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3640)

Labels of every account that rejected this request on entitlement.

---

### message

> **message**: `string`

Defined in: [types/proxy.ts:3642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3642)

Upstream message from the first such rejection.

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:3643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3643)
