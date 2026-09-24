[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderStatus

# Type Alias: ProviderStatus

> **ProviderStatus** = `object`

Defined in: [types/providers.ts:125](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L125)

Provider status information

## Properties

### provider

> **provider**: `string`

Defined in: [types/providers.ts:126](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L126)

---

### status

> **status**: `"working"` \| `"failed"` \| `"not-configured"`

Defined in: [types/providers.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L127)

---

### configured

> **configured**: `boolean`

Defined in: [types/providers.ts:128](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L128)

---

### authenticated

> **authenticated**: `boolean`

Defined in: [types/providers.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L129)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:130](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L130)

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/providers.ts:131](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L131)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:132](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L132)

---

### subscription?

> `optional` **subscription?**: [`SubscriptionInfo`](SubscriptionInfo.md)

Defined in: [types/providers.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L137)

Subscription information for providers that support subscription tiers
(e.g., Anthropic Claude with Pro/Max/Team/Enterprise subscriptions)

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:141](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L141)

The authentication method currently in use for this provider
