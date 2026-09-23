[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountRoutingCandidate

# Type Alias: ProxyAccountRoutingCandidate

> **ProxyAccountRoutingCandidate** = `object`

Defined in: [types/proxy.ts:598](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L598)

## Properties

### account

> **account**: `string`

Defined in: [types/proxy.ts:599](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L599)

---

### accountType

> **accountType**: [`ProxyAccountType`](ProxyAccountType.md)

Defined in: [types/proxy.ts:600](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L600)

---

### sourceIndex

> **sourceIndex**: `number`

Defined in: [types/proxy.ts:601](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L601)

---

### rank

> **rank**: `number`

Defined in: [types/proxy.ts:602](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L602)

---

### configuredPrimary

> **configuredPrimary**: `boolean`

Defined in: [types/proxy.ts:603](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L603)

---

### usable

> **usable**: `boolean`

Defined in: [types/proxy.ts:604](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L604)

---

### saturated

> **saturated**: `boolean`

Defined in: [types/proxy.ts:605](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L605)

---

### quotaObserved

> **quotaObserved**: `boolean`

Defined in: [types/proxy.ts:606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L606)

---

### quotaStale

> **quotaStale**: `boolean`

Defined in: [types/proxy.ts:607](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L607)

---

### quotaFreshness?

> `optional` **quotaFreshness?**: [`ProxyQuotaFreshness`](ProxyQuotaFreshness.md)

Defined in: [types/proxy.ts:608](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L608)

---

### refreshNeeded?

> `optional` **refreshNeeded?**: `boolean`

Defined in: [types/proxy.ts:609](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L609)

---

### refreshReason?

> `optional` **refreshReason?**: [`ProxyQuotaRefreshReason`](ProxyQuotaRefreshReason.md) \| `null`

Defined in: [types/proxy.ts:610](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L610)

---

### refreshInFlight?

> `optional` **refreshInFlight?**: `boolean`

Defined in: [types/proxy.ts:611](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L611)

---

### lastRefreshAttemptAt?

> `optional` **lastRefreshAttemptAt?**: `number` \| `null`

Defined in: [types/proxy.ts:612](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L612)

---

### lastRefreshSuccessAt?

> `optional` **lastRefreshSuccessAt?**: `number` \| `null`

Defined in: [types/proxy.ts:613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L613)

---

### nextRefreshEligibleAt?

> `optional` **nextRefreshEligibleAt?**: `number` \| `null`

Defined in: [types/proxy.ts:614](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L614)

---

### saturationKind?

> `optional` **saturationKind?**: [`ProxyQuotaSaturationKind`](ProxyQuotaSaturationKind.md)

Defined in: [types/proxy.ts:615](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L615)

---

### softLimitOverrideReason?

> `optional` **softLimitOverrideReason?**: `"overage"` \| `"weekly_expiry"` \| `null`

Defined in: [types/proxy.ts:616](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L616)

---

### quotaLastUpdated

> **quotaLastUpdated**: `number` \| `null`

Defined in: [types/proxy.ts:617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L617)

---

### quotaAgeMs

> **quotaAgeMs**: `number` \| `null`

Defined in: [types/proxy.ts:618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L618)

---

### coolingActive

> **coolingActive**: `boolean`

Defined in: [types/proxy.ts:619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L619)

---

### coolingReason

> **coolingReason**: [`AccountCoolingReason`](AccountCoolingReason.md) \| `null`

Defined in: [types/proxy.ts:620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L620)

---

### coolingUntil

> **coolingUntil**: `number` \| `null`

Defined in: [types/proxy.ts:621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L621)

---

### unifiedStatus

> **unifiedStatus**: `string` \| `null`

Defined in: [types/proxy.ts:622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L622)

---

### fallbackStatus?

> `optional` **fallbackStatus?**: `string` \| `null`

Defined in: [types/proxy.ts:623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L623)

---

### upgradePaths?

> `optional` **upgradePaths?**: `string` \| `null`

Defined in: [types/proxy.ts:624](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L624)

---

### overageEligible?

> `optional` **overageEligible?**: `boolean`

Defined in: [types/proxy.ts:625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L625)

---

### overageStatus

> **overageStatus**: `string` \| `null`

Defined in: [types/proxy.ts:626](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L626)

---

### sessionStatus

> **sessionStatus**: `string` \| `null`

Defined in: [types/proxy.ts:627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L627)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:628](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L628)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:629](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L629)

---

### sessionResetBucket

> **sessionResetBucket**: `number` \| `null`

Defined in: [types/proxy.ts:630](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L630)

---

### weeklyStatus

> **weeklyStatus**: `string` \| `null`

Defined in: [types/proxy.ts:631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L631)

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:632](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L632)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L633)

---

### scopedModel?

> `optional` **scopedModel?**: `string` \| `null`

Defined in: [types/proxy.ts:637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L637)

Display name of the model-scoped window that matched the requested model
(e.g. "Fable"), or null when the account reports no scoped cap for it.
Optional so schema-v1 readers of older records stay valid.

---

### scopedStatus?

> `optional` **scopedStatus?**: `string` \| `null`

Defined in: [types/proxy.ts:638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L638)

---

### scopedUsed?

> `optional` **scopedUsed?**: `number` \| `null`

Defined in: [types/proxy.ts:639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L639)

---

### scopedResetAt?

> `optional` **scopedResetAt?**: `number` \| `null`

Defined in: [types/proxy.ts:640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L640)
