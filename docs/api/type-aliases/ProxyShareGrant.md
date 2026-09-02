[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrant

# Type Alias: ProxyShareGrant

> **ProxyShareGrant** = `object`

Defined in: [types/proxy.ts:3488](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3488)

One lender-issued authorization for one borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3489)

---

### id

> **id**: `string`

Defined in: [types/proxy.ts:3490](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3490)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3491)

---

### tokenHash

> **tokenHash**: `string`

Defined in: [types/proxy.ts:3493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3493)

sha256(salt + token). The token itself is never persisted.

---

### tokenSalt

> **tokenSalt**: `string`

Defined in: [types/proxy.ts:3494](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3494)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3495)

---

### state

> **state**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:3496](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3496)

---

### entitlement

> **entitlement**: [`ProxyShareEntitlement`](ProxyShareEntitlement.md)

Defined in: [types/proxy.ts:3497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3497)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3498](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3498)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:3499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3499)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3500](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3500)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:3501](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3501)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:3502](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3502)

---

### leaseSecret?

> `optional` **leaseSecret?**: `string`

Defined in: [types/proxy.ts:3504](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3504)

Complete-mode only: shared secret the lease signature is keyed by.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:3510](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3510)

Shared secret receipts and netting claims are keyed by. Minted with the
grant and handed to the borrower in the share link; deliberately survives
`share rotate`, so receipts issued under an old token stay checkable.

---

### nettedCoins?

> `optional` **nettedCoins?**: `number`

Defined in: [types/proxy.ts:3512](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3512)

Cumulative coins forgiven by reciprocal netting on this grant.

---

### provisionedAccount?

> `optional` **provisionedAccount?**: `string`

Defined in: [types/proxy.ts:3514](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3514)

Complete-mode only: which of the lender's own accounts was provisioned.

---

### leasePolicy?

> `optional` **leasePolicy?**: `object`

Defined in: [types/proxy.ts:3516](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3516)

Complete-mode lease shape. Absent means the defaults apply.

#### ttlMs

> **ttlMs**: `number`

#### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

#### offlineGraceMs

> **offlineGraceMs**: `number`
