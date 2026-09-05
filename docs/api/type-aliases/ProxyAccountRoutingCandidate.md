[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountRoutingCandidate

# Type Alias: ProxyAccountRoutingCandidate

> **ProxyAccountRoutingCandidate** = `object`

Defined in: [types/proxy.ts:566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L566)

## Properties

### account

> **account**: `string`

Defined in: [types/proxy.ts:567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L567)

---

### accountType

> **accountType**: [`ProxyAccountType`](ProxyAccountType.md)

Defined in: [types/proxy.ts:568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L568)

---

### sourceIndex

> **sourceIndex**: `number`

Defined in: [types/proxy.ts:569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L569)

---

### rank

> **rank**: `number`

Defined in: [types/proxy.ts:570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L570)

---

### configuredPrimary

> **configuredPrimary**: `boolean`

Defined in: [types/proxy.ts:571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L571)

---

### usable

> **usable**: `boolean`

Defined in: [types/proxy.ts:572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L572)

---

### saturated

> **saturated**: `boolean`

Defined in: [types/proxy.ts:573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L573)

---

### quotaObserved

> **quotaObserved**: `boolean`

Defined in: [types/proxy.ts:574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L574)

---

### quotaStale

> **quotaStale**: `boolean`

Defined in: [types/proxy.ts:575](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L575)

---

### quotaFreshness?

> `optional` **quotaFreshness?**: [`ProxyQuotaFreshness`](ProxyQuotaFreshness.md)

Defined in: [types/proxy.ts:576](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L576)

---

### refreshNeeded?

> `optional` **refreshNeeded?**: `boolean`

Defined in: [types/proxy.ts:577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L577)

---

### refreshReason?

> `optional` **refreshReason?**: [`ProxyQuotaRefreshReason`](ProxyQuotaRefreshReason.md) \| `null`

Defined in: [types/proxy.ts:578](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L578)

---

### refreshInFlight?

> `optional` **refreshInFlight?**: `boolean`

Defined in: [types/proxy.ts:579](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L579)

---

### lastRefreshAttemptAt?

> `optional` **lastRefreshAttemptAt?**: `number` \| `null`

Defined in: [types/proxy.ts:580](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L580)

---

### lastRefreshSuccessAt?

> `optional` **lastRefreshSuccessAt?**: `number` \| `null`

Defined in: [types/proxy.ts:581](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L581)

---

### nextRefreshEligibleAt?

> `optional` **nextRefreshEligibleAt?**: `number` \| `null`

Defined in: [types/proxy.ts:582](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L582)

---

### saturationKind?

> `optional` **saturationKind?**: [`ProxyQuotaSaturationKind`](ProxyQuotaSaturationKind.md)

Defined in: [types/proxy.ts:583](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L583)

---

### softLimitOverrideReason?

> `optional` **softLimitOverrideReason?**: `"overage"` \| `"weekly_expiry"` \| `null`

Defined in: [types/proxy.ts:584](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L584)

---

### quotaLastUpdated

> **quotaLastUpdated**: `number` \| `null`

Defined in: [types/proxy.ts:585](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L585)

---

### quotaAgeMs

> **quotaAgeMs**: `number` \| `null`

Defined in: [types/proxy.ts:586](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L586)

---

### coolingActive

> **coolingActive**: `boolean`

Defined in: [types/proxy.ts:587](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L587)

---

### coolingReason

> **coolingReason**: [`AccountCoolingReason`](AccountCoolingReason.md) \| `null`

Defined in: [types/proxy.ts:588](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L588)

---

### coolingUntil

> **coolingUntil**: `number` \| `null`

Defined in: [types/proxy.ts:589](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L589)

---

### unifiedStatus

> **unifiedStatus**: `string` \| `null`

Defined in: [types/proxy.ts:590](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L590)

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string` \| `null`

Defined in: [types/proxy.ts:591](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L591)

---

### upgradePaths?

> `optional` **upgradePaths?**: `string` \| `null`

Defined in: [types/proxy.ts:592](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L592)

---

### overageEligible?

> `optional` **overageEligible?**: `boolean`

Defined in: [types/proxy.ts:593](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L593)

---

### overageStatus

> **overageStatus**: `string` \| `null`

Defined in: [types/proxy.ts:594](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L594)

---

### sessionStatus

> **sessionStatus**: `string` \| `null`

Defined in: [types/proxy.ts:595](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L595)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:596](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L596)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:597](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L597)

---

### sessionResetBucket

> **sessionResetBucket**: `number` \| `null`

Defined in: [types/proxy.ts:598](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L598)

---

### weeklyStatus

> **weeklyStatus**: `string` \| `null`

Defined in: [types/proxy.ts:599](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L599)

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:600](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L600)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:601](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L601)

---

### scopedModel?

> `optional` **scopedModel?**: `string` \| `null`

Defined in: [types/proxy.ts:605](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L605)

Display name of the model-scoped window that matched the requested model
(e.g. "Fable"), or null when the account reports no scoped cap for it.
Optional so schema-v1 readers of older records stay valid.

---

### scopedStatus?

> `optional` **scopedStatus?**: `string` \| `null`

Defined in: [types/proxy.ts:606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L606)

---

### scopedUsed?

> `optional` **scopedUsed?**: `number` \| `null`

Defined in: [types/proxy.ts:607](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L607)

---

### scopedResetAt?

> `optional` **scopedResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:608](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L608)
