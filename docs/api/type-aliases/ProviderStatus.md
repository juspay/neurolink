[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderStatus

# Type Alias: ProviderStatus

> **ProviderStatus** = `object`

Defined in: [types/providers.ts:126](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L126)

Provider status information

## Properties

### provider

> **provider**: `string`

Defined in: [types/providers.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L127)

---

### status

> **status**: `"working"` \| `"failed"` \| `"not-configured"`

Defined in: [types/providers.ts:128](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L128)

---

### configured

> **configured**: `boolean`

Defined in: [types/providers.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L129)

---

### authenticated

> **authenticated**: `boolean`

Defined in: [types/providers.ts:130](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L130)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:131](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L131)

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/providers.ts:132](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L132)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:133](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L133)

---

### subscription?

> `optional` **subscription?**: [`SubscriptionInfo`](SubscriptionInfo.md)

Defined in: [types/providers.ts:138](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L138)

Subscription information for providers that support subscription tiers
(e.g., Anthropic Claude with Pro/Max/Team/Enterprise subscriptions)

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:142](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L142)

The authentication method currently in use for this provider
