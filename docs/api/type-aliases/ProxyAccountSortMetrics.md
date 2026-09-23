[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountSortMetrics

# Type Alias: ProxyAccountSortMetrics

> **ProxyAccountSortMetrics** = `object`

Defined in: [types/proxy.ts:640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L640)

## Properties

### usable

> **usable**: `boolean`

Defined in: [types/proxy.ts:641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L641)

---

### saturated

> **saturated**: `boolean`

Defined in: [types/proxy.ts:642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L642)

---

### hasQuota

> **hasQuota**: `boolean`

Defined in: [types/proxy.ts:643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L643)

---

### quotaEvidenceRank

> **quotaEvidenceRank**: `number`

Defined in: [types/proxy.ts:644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L644)

---

### quotaStale

> **quotaStale**: `boolean`

Defined in: [types/proxy.ts:645](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L645)

---

### quotaFreshness

> **quotaFreshness**: [`ProxyQuotaFreshness`](ProxyQuotaFreshness.md)

Defined in: [types/proxy.ts:646](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L646)

---

### refreshNeeded

> **refreshNeeded**: `boolean`

Defined in: [types/proxy.ts:647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L647)

---

### refreshReason

> **refreshReason**: [`ProxyQuotaRefreshReason`](ProxyQuotaRefreshReason.md) \| `null`

Defined in: [types/proxy.ts:648](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L648)

---

### refreshInFlight

> **refreshInFlight**: `boolean`

Defined in: [types/proxy.ts:649](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L649)

---

### lastRefreshAttemptAt

> **lastRefreshAttemptAt**: `number` \| `null`

Defined in: [types/proxy.ts:650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L650)

---

### lastRefreshSuccessAt

> **lastRefreshSuccessAt**: `number` \| `null`

Defined in: [types/proxy.ts:651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L651)

---

### nextRefreshEligibleAt

> **nextRefreshEligibleAt**: `number` \| `null`

Defined in: [types/proxy.ts:652](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L652)

---

### saturationKind

> **saturationKind**: [`ProxyQuotaSaturationKind`](ProxyQuotaSaturationKind.md)

Defined in: [types/proxy.ts:653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L653)

---

### softLimitOverrideReason

> **softLimitOverrideReason**: `"overage"` \| `"weekly_expiry"` \| `null`

Defined in: [types/proxy.ts:654](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L654)

---

### quotaLastUpdated

> **quotaLastUpdated**: `number` \| `null`

Defined in: [types/proxy.ts:655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L655)

---

### quotaAgeMs

> **quotaAgeMs**: `number` \| `null`

Defined in: [types/proxy.ts:656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L656)

---

### coolingActive

> **coolingActive**: `boolean`

Defined in: [types/proxy.ts:657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L657)

---

### coolingReason

> **coolingReason**: [`AccountCoolingReason`](AccountCoolingReason.md) \| `null`

Defined in: [types/proxy.ts:658](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L658)

---

### coolingUntil

> **coolingUntil**: `number`

Defined in: [types/proxy.ts:659](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L659)

---

### unifiedStatus

> **unifiedStatus**: `string` \| `null`

Defined in: [types/proxy.ts:660](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L660)

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string` \| `null`

Defined in: [types/proxy.ts:661](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L661)

---

### upgradePaths?

> `optional` **upgradePaths?**: `string` \| `null`

Defined in: [types/proxy.ts:662](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L662)

---

### overageEligible?

> `optional` **overageEligible?**: `boolean`

Defined in: [types/proxy.ts:663](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L663)

---

### overageStatus

> **overageStatus**: `string` \| `null`

Defined in: [types/proxy.ts:664](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L664)

---

### sessionStatus

> **sessionStatus**: `string` \| `null`

Defined in: [types/proxy.ts:665](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L665)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:666](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L666)

---

### sessionResetBucket

> **sessionResetBucket**: `number`

Defined in: [types/proxy.ts:667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L667)

---

### sessionReset

> **sessionReset**: `number`

Defined in: [types/proxy.ts:668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L668)

---

### weeklyStatus

> **weeklyStatus**: `string` \| `null`

Defined in: [types/proxy.ts:669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L669)

---

### weeklyReset

> **weeklyReset**: `number`

Defined in: [types/proxy.ts:670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L670)

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L671)

---

### weeklyUsedForSort

> **weeklyUsedForSort**: `number`

Defined in: [types/proxy.ts:672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L672)

---

### scopedModel

> **scopedModel**: `string` \| `null`

Defined in: [types/proxy.ts:676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L676)

Model-scoped weekly window matching the requested model. All null/false
when the account reports no scoped cap for it (the common case), which
makes every scoped comparator rung a no-op for unscoped traffic.

---

### scopedStatus

> **scopedStatus**: `string` \| `null`

Defined in: [types/proxy.ts:677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L677)

---

### scopedUsed

> **scopedUsed**: `number` \| `null`

Defined in: [types/proxy.ts:678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L678)

---

### scopedReset

> **scopedReset**: `number`

Defined in: [types/proxy.ts:679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L679)

---

### scopedUsedForSort

> **scopedUsedForSort**: `number`

Defined in: [types/proxy.ts:680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L680)

---

### scopedSaturated

> **scopedSaturated**: `boolean`

Defined in: [types/proxy.ts:681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L681)
