[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrant

# Type Alias: ProxyShareGrant

> **ProxyShareGrant** = `object`

Defined in: [types/proxy.ts:3479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3479)

One lender-issued authorization for one borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3480](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3480)

---

### id

> **id**: `string`

Defined in: [types/proxy.ts:3481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3481)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3482](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3482)

---

### tokenHash

> **tokenHash**: `string`

Defined in: [types/proxy.ts:3484](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3484)

sha256(salt + token). The token itself is never persisted.

---

### tokenSalt

> **tokenSalt**: `string`

Defined in: [types/proxy.ts:3485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3485)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3486](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3486)

---

### state

> **state**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:3487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3487)

---

### entitlement

> **entitlement**: [`ProxyShareEntitlement`](ProxyShareEntitlement.md)

Defined in: [types/proxy.ts:3488](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3488)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3489)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:3490](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3490)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3491)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:3492](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3492)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:3493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3493)

---

### leaseSecret?

> `optional` **leaseSecret?**: `string`

Defined in: [types/proxy.ts:3495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3495)

Complete-mode only: shared secret the lease signature is keyed by.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:3501](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3501)

Shared secret receipts and netting claims are keyed by. Minted with the
grant and handed to the borrower in the share link; deliberately survives
`share rotate`, so receipts issued under an old token stay checkable.

---

### nettedCoins?

> `optional` **nettedCoins?**: `number`

Defined in: [types/proxy.ts:3503](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3503)

Cumulative coins forgiven by reciprocal netting on this grant.

---

### provisionedAccount?

> `optional` **provisionedAccount?**: `string`

Defined in: [types/proxy.ts:3505](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3505)

Complete-mode only: which of the lender's own accounts was provisioned.

---

### leasePolicy?

> `optional` **leasePolicy?**: `object`

Defined in: [types/proxy.ts:3507](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3507)

Complete-mode lease shape. Absent means the defaults apply.

#### ttlMs

> **ttlMs**: `number`

#### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

#### offlineGraceMs

> **offlineGraceMs**: `number`
