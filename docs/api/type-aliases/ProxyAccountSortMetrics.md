[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountSortMetrics

# Type Alias: ProxyAccountSortMetrics

> **ProxyAccountSortMetrics** = `object`

Defined in: [types/proxy.ts:663](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L663)

## Properties

### usable

> **usable**: `boolean`

Defined in: [types/proxy.ts:664](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L664)

---

### saturated

> **saturated**: `boolean`

Defined in: [types/proxy.ts:665](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L665)

---

### hasQuota

> **hasQuota**: `boolean`

Defined in: [types/proxy.ts:666](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L666)

---

### quotaEvidenceRank

> **quotaEvidenceRank**: `number`

Defined in: [types/proxy.ts:667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L667)

---

### quotaStale

> **quotaStale**: `boolean`

Defined in: [types/proxy.ts:668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L668)

---

### quotaFreshness

> **quotaFreshness**: [`ProxyQuotaFreshness`](ProxyQuotaFreshness.md)

Defined in: [types/proxy.ts:669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L669)

---

### refreshNeeded

> **refreshNeeded**: `boolean`

Defined in: [types/proxy.ts:670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L670)

---

### refreshReason

> **refreshReason**: [`ProxyQuotaRefreshReason`](ProxyQuotaRefreshReason.md) \| `null`

Defined in: [types/proxy.ts:671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L671)

---

### refreshInFlight

> **refreshInFlight**: `boolean`

Defined in: [types/proxy.ts:672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L672)

---

### lastRefreshAttemptAt

> **lastRefreshAttemptAt**: `number` \| `null`

Defined in: [types/proxy.ts:673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L673)

---

### lastRefreshSuccessAt

> **lastRefreshSuccessAt**: `number` \| `null`

Defined in: [types/proxy.ts:674](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L674)

---

### nextRefreshEligibleAt

> **nextRefreshEligibleAt**: `number` \| `null`

Defined in: [types/proxy.ts:675](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L675)

---

### saturationKind

> **saturationKind**: [`ProxyQuotaSaturationKind`](ProxyQuotaSaturationKind.md)

Defined in: [types/proxy.ts:676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L676)

---

### softLimitOverrideReason

> **softLimitOverrideReason**: `"overage"` \| `"weekly_expiry"` \| `null`

Defined in: [types/proxy.ts:677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L677)

---

### quotaLastUpdated

> **quotaLastUpdated**: `number` \| `null`

Defined in: [types/proxy.ts:678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L678)

---

### quotaAgeMs

> **quotaAgeMs**: `number` \| `null`

Defined in: [types/proxy.ts:679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L679)

---

### coolingActive

> **coolingActive**: `boolean`

Defined in: [types/proxy.ts:680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L680)

---

### coolingReason

> **coolingReason**: [`AccountCoolingReason`](AccountCoolingReason.md) \| `null`

Defined in: [types/proxy.ts:681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L681)

---

### coolingUntil

> **coolingUntil**: `number`

Defined in: [types/proxy.ts:682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L682)

---

### unifiedStatus

> **unifiedStatus**: `string` \| `null`

Defined in: [types/proxy.ts:683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L683)

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string` \| `null`

Defined in: [types/proxy.ts:684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L684)

---

### upgradePaths?

> `optional` **upgradePaths?**: `string` \| `null`

Defined in: [types/proxy.ts:685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L685)

---

### overageEligible?

> `optional` **overageEligible?**: `boolean`

Defined in: [types/proxy.ts:686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L686)

---

### overageStatus

> **overageStatus**: `string` \| `null`

Defined in: [types/proxy.ts:687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L687)

---

### sessionStatus

> **sessionStatus**: `string` \| `null`

Defined in: [types/proxy.ts:688](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L688)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L689)

---

### sessionResetBucket

> **sessionResetBucket**: `number`

Defined in: [types/proxy.ts:690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L690)

---

### sessionReset

> **sessionReset**: `number`

Defined in: [types/proxy.ts:691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L691)

---

### weeklyStatus

> **weeklyStatus**: `string` \| `null`

Defined in: [types/proxy.ts:692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L692)

---

### weeklyReset

> **weeklyReset**: `number`

Defined in: [types/proxy.ts:693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L693)

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L694)

---

### weeklyUsedForSort

> **weeklyUsedForSort**: `number`

Defined in: [types/proxy.ts:695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L695)

---

### scopedModel

> **scopedModel**: `string` \| `null`

Defined in: [types/proxy.ts:699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L699)

Model-scoped weekly window matching the requested model. All null/false
when the account reports no scoped cap for it (the common case), which
makes every scoped comparator rung a no-op for unscoped traffic.

---

### scopedStatus

> **scopedStatus**: `string` \| `null`

Defined in: [types/proxy.ts:700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L700)

---

### scopedUsed

> **scopedUsed**: `number` \| `null`

Defined in: [types/proxy.ts:701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L701)

---

### scopedReset

> **scopedReset**: `number`

Defined in: [types/proxy.ts:702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L702)

---

### scopedUsedForSort

> **scopedUsedForSort**: `number`

Defined in: [types/proxy.ts:703](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L703)

---

### scopedSaturated

> **scopedSaturated**: `boolean`

Defined in: [types/proxy.ts:704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L704)
