[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrant

# Type Alias: ProxyShareGrant

> **ProxyShareGrant** = `object`

Defined in: [types/proxy.ts:3832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3832)

One lender-issued authorization for one borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3833)

---

### id

> **id**: `string`

Defined in: [types/proxy.ts:3834](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3834)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3835](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3835)

---

### tokenHash

> **tokenHash**: `string`

Defined in: [types/proxy.ts:3837](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3837)

sha256(salt + token). The token itself is never persisted.

---

### tokenSalt

> **tokenSalt**: `string`

Defined in: [types/proxy.ts:3838](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3838)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3839](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3839)

---

### state

> **state**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:3840](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3840)

---

### entitlement

> **entitlement**: [`ProxyShareEntitlement`](ProxyShareEntitlement.md)

Defined in: [types/proxy.ts:3841](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3841)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3842](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3842)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:3843](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3843)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3844](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3844)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:3845](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3845)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:3846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3846)

---

### leaseSecret?

> `optional` **leaseSecret?**: `string`

Defined in: [types/proxy.ts:3848](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3848)

Complete-mode only: shared secret the lease signature is keyed by.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:3854](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3854)

Shared secret receipts and netting claims are keyed by. Minted with the
grant and handed to the borrower in the share link; deliberately survives
`share rotate`, so receipts issued under an old token stay checkable.

---

### nettedCoins?

> `optional` **nettedCoins?**: `number`

Defined in: [types/proxy.ts:3856](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3856)

Cumulative coins forgiven by reciprocal netting on this grant.

---

### provisionedAccount?

> `optional` **provisionedAccount?**: `string`

Defined in: [types/proxy.ts:3858](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3858)

Complete-mode only: which of the lender's own accounts was provisioned.

---

### leasePolicy?

> `optional` **leasePolicy?**: `object`

Defined in: [types/proxy.ts:3860](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3860)

Complete-mode lease shape. Absent means the defaults apply.

#### ttlMs

> **ttlMs**: `number`

#### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

#### offlineGraceMs

> **offlineGraceMs**: `number`
