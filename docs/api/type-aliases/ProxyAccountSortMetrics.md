[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountSortMetrics

# Type Alias: ProxyAccountSortMetrics

> **ProxyAccountSortMetrics** = `object`

Defined in: [types/proxy.ts:628](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L628)

## Properties

### usable

> **usable**: `boolean`

Defined in: [types/proxy.ts:629](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L629)

---

### saturated

> **saturated**: `boolean`

Defined in: [types/proxy.ts:630](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L630)

---

### hasQuota

> **hasQuota**: `boolean`

Defined in: [types/proxy.ts:631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L631)

---

### quotaEvidenceRank

> **quotaEvidenceRank**: `number`

Defined in: [types/proxy.ts:632](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L632)

---

### quotaStale

> **quotaStale**: `boolean`

Defined in: [types/proxy.ts:633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L633)

---

### quotaFreshness

> **quotaFreshness**: [`ProxyQuotaFreshness`](ProxyQuotaFreshness.md)

Defined in: [types/proxy.ts:634](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L634)

---

### refreshNeeded

> **refreshNeeded**: `boolean`

Defined in: [types/proxy.ts:635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L635)

---

### refreshReason

> **refreshReason**: [`ProxyQuotaRefreshReason`](ProxyQuotaRefreshReason.md) \| `null`

Defined in: [types/proxy.ts:636](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L636)

---

### refreshInFlight

> **refreshInFlight**: `boolean`

Defined in: [types/proxy.ts:637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L637)

---

### lastRefreshAttemptAt

> **lastRefreshAttemptAt**: `number` \| `null`

Defined in: [types/proxy.ts:638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L638)

---

### lastRefreshSuccessAt

> **lastRefreshSuccessAt**: `number` \| `null`

Defined in: [types/proxy.ts:639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L639)

---

### nextRefreshEligibleAt

> **nextRefreshEligibleAt**: `number` \| `null`

Defined in: [types/proxy.ts:640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L640)

---

### saturationKind

> **saturationKind**: [`ProxyQuotaSaturationKind`](ProxyQuotaSaturationKind.md)

Defined in: [types/proxy.ts:641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L641)

---

### softLimitOverrideReason

> **softLimitOverrideReason**: `"overage"` \| `"weekly_expiry"` \| `null`

Defined in: [types/proxy.ts:642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L642)

---

### quotaLastUpdated

> **quotaLastUpdated**: `number` \| `null`

Defined in: [types/proxy.ts:643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L643)

---

### quotaAgeMs

> **quotaAgeMs**: `number` \| `null`

Defined in: [types/proxy.ts:644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L644)

---

### coolingActive

> **coolingActive**: `boolean`

Defined in: [types/proxy.ts:645](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L645)

---

### coolingReason

> **coolingReason**: [`AccountCoolingReason`](AccountCoolingReason.md) \| `null`

Defined in: [types/proxy.ts:646](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L646)

---

### coolingUntil

> **coolingUntil**: `number`

Defined in: [types/proxy.ts:647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L647)

---

### unifiedStatus

> **unifiedStatus**: `string` \| `null`

Defined in: [types/proxy.ts:648](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L648)

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string` \| `null`

Defined in: [types/proxy.ts:649](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L649)

---

### upgradePaths?

> `optional` **upgradePaths?**: `string` \| `null`

Defined in: [types/proxy.ts:650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L650)

---

### overageEligible?

> `optional` **overageEligible?**: `boolean`

Defined in: [types/proxy.ts:651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L651)

---

### overageStatus

> **overageStatus**: `string` \| `null`

Defined in: [types/proxy.ts:652](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L652)

---

### sessionStatus

> **sessionStatus**: `string` \| `null`

Defined in: [types/proxy.ts:653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L653)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:654](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L654)

---

### sessionResetBucket

> **sessionResetBucket**: `number`

Defined in: [types/proxy.ts:655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L655)

---

### sessionReset

> **sessionReset**: `number`

Defined in: [types/proxy.ts:656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L656)

---

### weeklyStatus

> **weeklyStatus**: `string` \| `null`

Defined in: [types/proxy.ts:657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L657)

---

### weeklyReset

> **weeklyReset**: `number`

Defined in: [types/proxy.ts:658](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L658)

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:659](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L659)

---

### weeklyUsedForSort

> **weeklyUsedForSort**: `number`

Defined in: [types/proxy.ts:660](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L660)

---

### scopedModel

> **scopedModel**: `string` \| `null`

Defined in: [types/proxy.ts:664](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L664)

Model-scoped weekly window matching the requested model. All null/false
when the account reports no scoped cap for it (the common case), which
makes every scoped comparator rung a no-op for unscoped traffic.

---

### scopedStatus

> **scopedStatus**: `string` \| `null`

Defined in: [types/proxy.ts:665](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L665)

---

### scopedUsed

> **scopedUsed**: `number` \| `null`

Defined in: [types/proxy.ts:666](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L666)

---

### scopedReset

> **scopedReset**: `number`

Defined in: [types/proxy.ts:667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L667)

---

### scopedUsedForSort

> **scopedUsedForSort**: `number`

Defined in: [types/proxy.ts:668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L668)

---

### scopedSaturated

> **scopedSaturated**: `boolean`

Defined in: [types/proxy.ts:669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L669)
