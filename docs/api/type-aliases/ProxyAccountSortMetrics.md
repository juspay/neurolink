[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountSortMetrics

# Type Alias: ProxyAccountSortMetrics

> **ProxyAccountSortMetrics** = `object`

## Properties

### usable

> **usable**: `boolean`

---

### saturated

> **saturated**: `boolean`

---

### hasQuota

> **hasQuota**: `boolean`

---

### quotaEvidenceRank

> **quotaEvidenceRank**: `number`

---

### quotaStale

> **quotaStale**: `boolean`

---

### quotaFreshness

> **quotaFreshness**: [`ProxyQuotaFreshness`](ProxyQuotaFreshness.md)

---

### refreshNeeded

> **refreshNeeded**: `boolean`

---

### refreshReason

> **refreshReason**: [`ProxyQuotaRefreshReason`](ProxyQuotaRefreshReason.md) \| `null`

---

### refreshInFlight

> **refreshInFlight**: `boolean`

---

### lastRefreshAttemptAt

> **lastRefreshAttemptAt**: `number` \| `null`

---

### lastRefreshSuccessAt

> **lastRefreshSuccessAt**: `number` \| `null`

---

### nextRefreshEligibleAt

> **nextRefreshEligibleAt**: `number` \| `null`

---

### saturationKind

> **saturationKind**: [`ProxyQuotaSaturationKind`](ProxyQuotaSaturationKind.md)

---

### softLimitOverrideReason

> **softLimitOverrideReason**: `"overage"` \| `"weekly_expiry"` \| `null`

---

### quotaLastUpdated

> **quotaLastUpdated**: `number` \| `null`

---

### quotaAgeMs

> **quotaAgeMs**: `number` \| `null`

---

### coolingActive

> **coolingActive**: `boolean`

---

### coolingReason

> **coolingReason**: [`AccountCoolingReason`](AccountCoolingReason.md) \| `null`

---

### coolingUntil

> **coolingUntil**: `number`

---

### unifiedStatus

> **unifiedStatus**: `string` \| `null`

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string` \| `null`

---

### upgradePaths?

> `optional` **upgradePaths?**: `string` \| `null`

---

### overageEligible?

> `optional` **overageEligible?**: `boolean`

---

### overageStatus

> **overageStatus**: `string` \| `null`

---

### sessionStatus

> **sessionStatus**: `string` \| `null`

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

---

### sessionResetBucket

> **sessionResetBucket**: `number`

---

### sessionReset

> **sessionReset**: `number`

---

### weeklyStatus

> **weeklyStatus**: `string` \| `null`

---

### weeklyReset

> **weeklyReset**: `number`

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

---

### weeklyUsedForSort

> **weeklyUsedForSort**: `number`

---

### scopedModel

> **scopedModel**: `string` \| `null`

Model-scoped weekly window matching the requested model. All null/false
when the account reports no scoped cap for it (the common case), which
makes every scoped comparator rung a no-op for unscoped traffic.

---

### scopedStatus

> **scopedStatus**: `string` \| `null`

---

### scopedUsed

> **scopedUsed**: `number` \| `null`

---

### scopedReset

> **scopedReset**: `number`

---

### scopedUsedForSort

> **scopedUsedForSort**: `number`

---

### scopedSaturated

> **scopedSaturated**: `boolean`
