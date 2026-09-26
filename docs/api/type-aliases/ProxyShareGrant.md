[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrant

# Type Alias: ProxyShareGrant

> **ProxyShareGrant** = `object`

One lender-issued authorization for one borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

---

### id

> **id**: `string`

---

### peerLabel

> **peerLabel**: `string`

---

### tokenHash

> **tokenHash**: `string`

sha256(salt + token). The token itself is never persisted.

---

### tokenSalt

> **tokenSalt**: `string`

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

---

### state

> **state**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

---

### entitlement

> **entitlement**: [`ProxyShareEntitlement`](ProxyShareEntitlement.md)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

---

### createdAt

> **createdAt**: `number`

---

### updatedAt

> **updatedAt**: `number`

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

---

### note?

> `optional` **note?**: `string`

---

### leaseSecret?

> `optional` **leaseSecret?**: `string`

Complete-mode only: shared secret the lease signature is keyed by.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Shared secret receipts and netting claims are keyed by. Minted with the
grant and handed to the borrower in the share link; deliberately survives
`share rotate`, so receipts issued under an old token stay checkable.

---

### nettedCoins?

> `optional` **nettedCoins?**: `number`

Cumulative coins forgiven by reciprocal netting on this grant.

---

### provisionedAccount?

> `optional` **provisionedAccount?**: `string`

Complete-mode only: which of the lender's own accounts was provisioned.

---

### leasePolicy?

> `optional` **leasePolicy?**: `object`

Complete-mode lease shape. Absent means the defaults apply.

#### ttlMs

> **ttlMs**: `number`

#### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

#### offlineGraceMs

> **offlineGraceMs**: `number`
