[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicEntitlementFailure

# Type Alias: AnthropicEntitlementFailure

> **AnthropicEntitlementFailure** = `object`

Defined in: [types/proxy.ts:3567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3567)

Accounts rejected by an organization/plan entitlement policy during a single
request. Anthropic answers such an account with a `permission_error` that no
amount of retrying or token refreshing can fix, but which a _different_
account may not hit at all — so it drives rotation, and is reported to the
client only once every account has been tried.

## Properties

### status

> **status**: `number`

Defined in: [types/proxy.ts:3568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3568)

---

### accounts

> **accounts**: `string`[]

Defined in: [types/proxy.ts:3570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3570)

Labels of every account that rejected this request on entitlement.

---

### message

> **message**: `string`

Defined in: [types/proxy.ts:3572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3572)

Upstream message from the first such rejection.

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:3573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3573)
