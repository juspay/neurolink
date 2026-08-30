[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrant

# Type Alias: ProxyShareGrant

> **ProxyShareGrant** = `object`

Defined in: [types/proxy.ts:3457](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3457)

One lender-issued authorization for one borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3458](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3458)

---

### id

> **id**: `string`

Defined in: [types/proxy.ts:3459](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3459)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3460](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3460)

---

### tokenHash

> **tokenHash**: `string`

Defined in: [types/proxy.ts:3462](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3462)

sha256(salt + token). The token itself is never persisted.

---

### tokenSalt

> **tokenSalt**: `string`

Defined in: [types/proxy.ts:3463](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3463)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3464](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3464)

---

### state

> **state**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:3465](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3465)

---

### entitlement

> **entitlement**: [`ProxyShareEntitlement`](ProxyShareEntitlement.md)

Defined in: [types/proxy.ts:3466](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3466)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3467](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3467)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:3468](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3468)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3469](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3469)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:3470](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3470)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:3471](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3471)

---

### leaseSecret?

> `optional` **leaseSecret?**: `string`

Defined in: [types/proxy.ts:3473](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3473)

Complete-mode only: shared secret the lease signature is keyed by.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:3479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3479)

Shared secret receipts and netting claims are keyed by. Minted with the
grant and handed to the borrower in the share link; deliberately survives
`share rotate`, so receipts issued under an old token stay checkable.

---

### nettedCoins?

> `optional` **nettedCoins?**: `number`

Defined in: [types/proxy.ts:3481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3481)

Cumulative coins forgiven by reciprocal netting on this grant.

---

### provisionedAccount?

> `optional` **provisionedAccount?**: `string`

Defined in: [types/proxy.ts:3483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3483)

Complete-mode only: which of the lender's own accounts was provisioned.

---

### leasePolicy?

> `optional` **leasePolicy?**: `object`

Defined in: [types/proxy.ts:3485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3485)

Complete-mode lease shape. Absent means the defaults apply.

#### ttlMs

> **ttlMs**: `number`

#### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

#### offlineGraceMs

> **offlineGraceMs**: `number`
