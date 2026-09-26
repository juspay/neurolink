[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountRoutingCandidate

# Type Alias: ProxyAccountRoutingCandidate

> **ProxyAccountRoutingCandidate** = `object`

## Properties

### account

> **account**: `string`

---

### accountType

> **accountType**: [`ProxyAccountType`](ProxyAccountType.md)

---

### sourceIndex

> **sourceIndex**: `number`

---

### rank

> **rank**: `number`

---

### configuredPrimary

> **configuredPrimary**: `boolean`

---

### usable

> **usable**: `boolean`

---

### saturated

> **saturated**: `boolean`

---

### quotaObserved

> **quotaObserved**: `boolean`

---

### quotaStale

> **quotaStale**: `boolean`

---

### quotaFreshness?

> `optional` **quotaFreshness?**: [`ProxyQuotaFreshness`](ProxyQuotaFreshness.md)

---

### refreshNeeded?

> `optional` **refreshNeeded?**: `boolean`

---

### refreshReason?

> `optional` **refreshReason?**: [`ProxyQuotaRefreshReason`](ProxyQuotaRefreshReason.md) \| `null`

---

### refreshInFlight?

> `optional` **refreshInFlight?**: `boolean`

---

### lastRefreshAttemptAt?

> `optional` **lastRefreshAttemptAt?**: `number` \| `null`

---

### lastRefreshSuccessAt?

> `optional` **lastRefreshSuccessAt?**: `number` \| `null`

---

### nextRefreshEligibleAt?

> `optional` **nextRefreshEligibleAt?**: `number` \| `null`

---

### saturationKind?

> `optional` **saturationKind?**: [`ProxyQuotaSaturationKind`](ProxyQuotaSaturationKind.md)

---

### softLimitOverrideReason?

> `optional` **softLimitOverrideReason?**: `"overage"` \| `"weekly_expiry"` \| `null`

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

> **coolingUntil**: `number` \| `null`

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

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

---

### sessionResetBucket

> **sessionResetBucket**: `number` \| `null`

---

### weeklyStatus

> **weeklyStatus**: `string` \| `null`

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

---

### scopedModel?

> `optional` **scopedModel?**: `string` \| `null`

Display name of the model-scoped window that matched the requested model
(e.g. "Fable"), or null when the account reports no scoped cap for it.
Optional so schema-v1 readers of older records stay valid.

---

### scopedStatus?

> `optional` **scopedStatus?**: `string` \| `null`

---

### scopedUsed?

> `optional` **scopedUsed?**: `number` \| `null`

---

### scopedResetAt?

> `optional` **scopedResetAt?**: `number` \| `null`
