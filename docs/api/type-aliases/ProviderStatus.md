[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderStatus

# Type Alias: ProviderStatus

> **ProviderStatus** = `object`

Defined in: [types/providers.ts:84](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L84)

Provider status information

## Properties

### provider

> **provider**: `string`

Defined in: [types/providers.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L85)

---

### status

> **status**: `"working"` \| `"failed"` \| `"not-configured"`

Defined in: [types/providers.ts:86](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L86)

---

### configured

> **configured**: `boolean`

Defined in: [types/providers.ts:87](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L87)

---

### authenticated

> **authenticated**: `boolean`

Defined in: [types/providers.ts:88](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L88)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:89](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L89)

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/providers.ts:90](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L90)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:91](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L91)

---

### subscription?

> `optional` **subscription?**: [`SubscriptionInfo`](SubscriptionInfo.md)

Defined in: [types/providers.ts:96](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L96)

Subscription information for providers that support subscription tiers
(e.g., Anthropic Claude with Pro/Max/Team/Enterprise subscriptions)

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:100](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L100)

The authentication method currently in use for this provider
