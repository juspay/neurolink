[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountRoutingCandidate

# Type Alias: ProxyAccountRoutingCandidate

> **ProxyAccountRoutingCandidate** = `object`

Defined in: [types/proxy.ts:561](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L561)

## Properties

### account

> **account**: `string`

Defined in: [types/proxy.ts:562](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L562)

---

### accountType

> **accountType**: [`ProxyAccountType`](ProxyAccountType.md)

Defined in: [types/proxy.ts:563](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L563)

---

### sourceIndex

> **sourceIndex**: `number`

Defined in: [types/proxy.ts:564](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L564)

---

### rank

> **rank**: `number`

Defined in: [types/proxy.ts:565](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L565)

---

### configuredPrimary

> **configuredPrimary**: `boolean`

Defined in: [types/proxy.ts:566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L566)

---

### usable

> **usable**: `boolean`

Defined in: [types/proxy.ts:567](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L567)

---

### saturated

> **saturated**: `boolean`

Defined in: [types/proxy.ts:568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L568)

---

### quotaObserved

> **quotaObserved**: `boolean`

Defined in: [types/proxy.ts:569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L569)

---

### quotaStale

> **quotaStale**: `boolean`

Defined in: [types/proxy.ts:570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L570)

---

### quotaFreshness?

> `optional` **quotaFreshness?**: [`ProxyQuotaFreshness`](ProxyQuotaFreshness.md)

Defined in: [types/proxy.ts:571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L571)

---

### refreshNeeded?

> `optional` **refreshNeeded?**: `boolean`

Defined in: [types/proxy.ts:572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L572)

---

### refreshReason?

> `optional` **refreshReason?**: [`ProxyQuotaRefreshReason`](ProxyQuotaRefreshReason.md) \| `null`

Defined in: [types/proxy.ts:573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L573)

---

### refreshInFlight?

> `optional` **refreshInFlight?**: `boolean`

Defined in: [types/proxy.ts:574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L574)

---

### lastRefreshAttemptAt?

> `optional` **lastRefreshAttemptAt?**: `number` \| `null`

Defined in: [types/proxy.ts:575](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L575)

---

### lastRefreshSuccessAt?

> `optional` **lastRefreshSuccessAt?**: `number` \| `null`

Defined in: [types/proxy.ts:576](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L576)

---

### nextRefreshEligibleAt?

> `optional` **nextRefreshEligibleAt?**: `number` \| `null`

Defined in: [types/proxy.ts:577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L577)

---

### saturationKind?

> `optional` **saturationKind?**: [`ProxyQuotaSaturationKind`](ProxyQuotaSaturationKind.md)

Defined in: [types/proxy.ts:578](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L578)

---

### softLimitOverrideReason?

> `optional` **softLimitOverrideReason?**: `"overage"` \| `"weekly_expiry"` \| `null`

Defined in: [types/proxy.ts:579](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L579)

---

### quotaLastUpdated

> **quotaLastUpdated**: `number` \| `null`

Defined in: [types/proxy.ts:580](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L580)

---

### quotaAgeMs

> **quotaAgeMs**: `number` \| `null`

Defined in: [types/proxy.ts:581](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L581)

---

### coolingActive

> **coolingActive**: `boolean`

Defined in: [types/proxy.ts:582](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L582)

---

### coolingReason

> **coolingReason**: [`AccountCoolingReason`](AccountCoolingReason.md) \| `null`

Defined in: [types/proxy.ts:583](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L583)

---

### coolingUntil

> **coolingUntil**: `number` \| `null`

Defined in: [types/proxy.ts:584](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L584)

---

### unifiedStatus

> **unifiedStatus**: `string` \| `null`

Defined in: [types/proxy.ts:585](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L585)

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string` \| `null`

Defined in: [types/proxy.ts:586](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L586)

---

### upgradePaths?

> `optional` **upgradePaths?**: `string` \| `null`

Defined in: [types/proxy.ts:587](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L587)

---

### overageEligible?

> `optional` **overageEligible?**: `boolean`

Defined in: [types/proxy.ts:588](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L588)

---

### overageStatus

> **overageStatus**: `string` \| `null`

Defined in: [types/proxy.ts:589](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L589)

---

### sessionStatus

> **sessionStatus**: `string` \| `null`

Defined in: [types/proxy.ts:590](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L590)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:591](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L591)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:592](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L592)

---

### sessionResetBucket

> **sessionResetBucket**: `number` \| `null`

Defined in: [types/proxy.ts:593](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L593)

---

### weeklyStatus

> **weeklyStatus**: `string` \| `null`

Defined in: [types/proxy.ts:594](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L594)

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:595](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L595)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:596](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L596)

---

### scopedModel?

> `optional` **scopedModel?**: `string` \| `null`

Defined in: [types/proxy.ts:600](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L600)

Display name of the model-scoped window that matched the requested model
(e.g. "Fable"), or null when the account reports no scoped cap for it.
Optional so schema-v1 readers of older records stay valid.

---

### scopedStatus?

> `optional` **scopedStatus?**: `string` \| `null`

Defined in: [types/proxy.ts:601](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L601)

---

### scopedUsed?

> `optional` **scopedUsed?**: `number` \| `null`

Defined in: [types/proxy.ts:602](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L602)

---

### scopedResetAt?

> `optional` **scopedResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:603](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L603)
