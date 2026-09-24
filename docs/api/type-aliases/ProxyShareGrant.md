[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrant

# Type Alias: ProxyShareGrant

> **ProxyShareGrant** = `object`

Defined in: [types/proxy.ts:4229](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4229)

One lender-issued authorization for one borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4230)

---

### id

> **id**: `string`

Defined in: [types/proxy.ts:4231](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4231)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4232](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4232)

---

### tokenHash

> **tokenHash**: `string`

Defined in: [types/proxy.ts:4234](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4234)

sha256(salt + token). The token itself is never persisted.

---

### tokenSalt

> **tokenSalt**: `string`

Defined in: [types/proxy.ts:4235](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4235)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4236](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4236)

---

### state

> **state**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:4237](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4237)

---

### entitlement

> **entitlement**: [`ProxyShareEntitlement`](ProxyShareEntitlement.md)

Defined in: [types/proxy.ts:4238](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4238)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4239)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4240)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4241)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4242](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4242)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4243)

---

### leaseSecret?

> `optional` **leaseSecret?**: `string`

Defined in: [types/proxy.ts:4245](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4245)

Complete-mode only: shared secret the lease signature is keyed by.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4251)

Shared secret receipts and netting claims are keyed by. Minted with the
grant and handed to the borrower in the share link; deliberately survives
`share rotate`, so receipts issued under an old token stay checkable.

---

### nettedCoins?

> `optional` **nettedCoins?**: `number`

Defined in: [types/proxy.ts:4253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4253)

Cumulative coins forgiven by reciprocal netting on this grant.

---

### provisionedAccount?

> `optional` **provisionedAccount?**: `string`

Defined in: [types/proxy.ts:4255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4255)

Complete-mode only: which of the lender's own accounts was provisioned.

---

### leasePolicy?

> `optional` **leasePolicy?**: `object`

Defined in: [types/proxy.ts:4257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4257)

Complete-mode lease shape. Absent means the defaults apply.

#### ttlMs

> **ttlMs**: `number`

#### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

#### offlineGraceMs

> **offlineGraceMs**: `number`
