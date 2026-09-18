[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrant

# Type Alias: ProxyShareGrant

> **ProxyShareGrant** = `object`

Defined in: [types/proxy.ts:3857](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3857)

One lender-issued authorization for one borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3858](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3858)

---

### id

> **id**: `string`

Defined in: [types/proxy.ts:3859](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3859)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3860](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3860)

---

### tokenHash

> **tokenHash**: `string`

Defined in: [types/proxy.ts:3862](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3862)

sha256(salt + token). The token itself is never persisted.

---

### tokenSalt

> **tokenSalt**: `string`

Defined in: [types/proxy.ts:3863](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3863)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3864](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3864)

---

### state

> **state**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:3865](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3865)

---

### entitlement

> **entitlement**: [`ProxyShareEntitlement`](ProxyShareEntitlement.md)

Defined in: [types/proxy.ts:3866](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3866)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3867](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3867)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:3868](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3868)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3869)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:3870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3870)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:3871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3871)

---

### leaseSecret?

> `optional` **leaseSecret?**: `string`

Defined in: [types/proxy.ts:3873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3873)

Complete-mode only: shared secret the lease signature is keyed by.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:3879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3879)

Shared secret receipts and netting claims are keyed by. Minted with the
grant and handed to the borrower in the share link; deliberately survives
`share rotate`, so receipts issued under an old token stay checkable.

---

### nettedCoins?

> `optional` **nettedCoins?**: `number`

Defined in: [types/proxy.ts:3881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3881)

Cumulative coins forgiven by reciprocal netting on this grant.

---

### provisionedAccount?

> `optional` **provisionedAccount?**: `string`

Defined in: [types/proxy.ts:3883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3883)

Complete-mode only: which of the lender's own accounts was provisioned.

---

### leasePolicy?

> `optional` **leasePolicy?**: `object`

Defined in: [types/proxy.ts:3885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3885)

Complete-mode lease shape. Absent means the defaults apply.

#### ttlMs

> **ttlMs**: `number`

#### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

#### offlineGraceMs

> **offlineGraceMs**: `number`
