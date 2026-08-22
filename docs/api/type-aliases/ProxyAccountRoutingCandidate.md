[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountRoutingCandidate

# Type Alias: ProxyAccountRoutingCandidate

> **ProxyAccountRoutingCandidate** = `object`

Defined in: [types/proxy.ts:558](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L558)

## Properties

### account

> **account**: `string`

Defined in: [types/proxy.ts:559](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L559)

---

### accountType

> **accountType**: [`ProxyAccountType`](ProxyAccountType.md)

Defined in: [types/proxy.ts:560](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L560)

---

### sourceIndex

> **sourceIndex**: `number`

Defined in: [types/proxy.ts:561](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L561)

---

### rank

> **rank**: `number`

Defined in: [types/proxy.ts:562](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L562)

---

### configuredPrimary

> **configuredPrimary**: `boolean`

Defined in: [types/proxy.ts:563](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L563)

---

### usable

> **usable**: `boolean`

Defined in: [types/proxy.ts:564](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L564)

---

### saturated

> **saturated**: `boolean`

Defined in: [types/proxy.ts:565](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L565)

---

### quotaObserved

> **quotaObserved**: `boolean`

Defined in: [types/proxy.ts:566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L566)

---

### quotaStale

> **quotaStale**: `boolean`

Defined in: [types/proxy.ts:567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L567)

---

### quotaFreshness?

> `optional` **quotaFreshness?**: [`ProxyQuotaFreshness`](ProxyQuotaFreshness.md)

Defined in: [types/proxy.ts:568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L568)

---

### refreshNeeded?

> `optional` **refreshNeeded?**: `boolean`

Defined in: [types/proxy.ts:569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L569)

---

### refreshReason?

> `optional` **refreshReason?**: [`ProxyQuotaRefreshReason`](ProxyQuotaRefreshReason.md) \| `null`

Defined in: [types/proxy.ts:570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L570)

---

### refreshInFlight?

> `optional` **refreshInFlight?**: `boolean`

Defined in: [types/proxy.ts:571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L571)

---

### lastRefreshAttemptAt?

> `optional` **lastRefreshAttemptAt?**: `number` \| `null`

Defined in: [types/proxy.ts:572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L572)

---

### lastRefreshSuccessAt?

> `optional` **lastRefreshSuccessAt?**: `number` \| `null`

Defined in: [types/proxy.ts:573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L573)

---

### nextRefreshEligibleAt?

> `optional` **nextRefreshEligibleAt?**: `number` \| `null`

Defined in: [types/proxy.ts:574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L574)

---

### saturationKind?

> `optional` **saturationKind?**: [`ProxyQuotaSaturationKind`](ProxyQuotaSaturationKind.md)

Defined in: [types/proxy.ts:575](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L575)

---

### softLimitOverrideReason?

> `optional` **softLimitOverrideReason?**: `"overage"` \| `"weekly_expiry"` \| `null`

Defined in: [types/proxy.ts:576](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L576)

---

### quotaLastUpdated

> **quotaLastUpdated**: `number` \| `null`

Defined in: [types/proxy.ts:577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L577)

---

### quotaAgeMs

> **quotaAgeMs**: `number` \| `null`

Defined in: [types/proxy.ts:578](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L578)

---

### coolingActive

> **coolingActive**: `boolean`

Defined in: [types/proxy.ts:579](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L579)

---

### coolingReason

> **coolingReason**: [`AccountCoolingReason`](AccountCoolingReason.md) \| `null`

Defined in: [types/proxy.ts:580](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L580)

---

### coolingUntil

> **coolingUntil**: `number` \| `null`

Defined in: [types/proxy.ts:581](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L581)

---

### unifiedStatus

> **unifiedStatus**: `string` \| `null`

Defined in: [types/proxy.ts:582](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L582)

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string` \| `null`

Defined in: [types/proxy.ts:583](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L583)

---

### upgradePaths?

> `optional` **upgradePaths?**: `string` \| `null`

Defined in: [types/proxy.ts:584](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L584)

---

### overageEligible?

> `optional` **overageEligible?**: `boolean`

Defined in: [types/proxy.ts:585](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L585)

---

### overageStatus

> **overageStatus**: `string` \| `null`

Defined in: [types/proxy.ts:586](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L586)

---

### sessionStatus

> **sessionStatus**: `string` \| `null`

Defined in: [types/proxy.ts:587](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L587)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:588](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L588)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:589](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L589)

---

### sessionResetBucket

> **sessionResetBucket**: `number` \| `null`

Defined in: [types/proxy.ts:590](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L590)

---

### weeklyStatus

> **weeklyStatus**: `string` \| `null`

Defined in: [types/proxy.ts:591](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L591)

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:592](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L592)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:593](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L593)

---

### scopedModel?

> `optional` **scopedModel?**: `string` \| `null`

Defined in: [types/proxy.ts:597](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L597)

Display name of the model-scoped window that matched the requested model
(e.g. "Fable"), or null when the account reports no scoped cap for it.
Optional so schema-v1 readers of older records stay valid.

---

### scopedStatus?

> `optional` **scopedStatus?**: `string` \| `null`

Defined in: [types/proxy.ts:598](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L598)

---

### scopedUsed?

> `optional` **scopedUsed?**: `number` \| `null`

Defined in: [types/proxy.ts:599](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L599)

---

### scopedResetAt?

> `optional` **scopedResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:600](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L600)
