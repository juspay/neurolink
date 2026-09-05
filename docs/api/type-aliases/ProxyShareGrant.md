[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrant

# Type Alias: ProxyShareGrant

> **ProxyShareGrant** = `object`

Defined in: [types/proxy.ts:3508](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3508)

One lender-issued authorization for one borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3509](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3509)

---

### id

> **id**: `string`

Defined in: [types/proxy.ts:3510](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3510)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3511](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3511)

---

### tokenHash

> **tokenHash**: `string`

Defined in: [types/proxy.ts:3513](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3513)

sha256(salt + token). The token itself is never persisted.

---

### tokenSalt

> **tokenSalt**: `string`

Defined in: [types/proxy.ts:3514](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3514)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3515](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3515)

---

### state

> **state**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:3516](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3516)

---

### entitlement

> **entitlement**: [`ProxyShareEntitlement`](ProxyShareEntitlement.md)

Defined in: [types/proxy.ts:3517](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3517)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3518](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3518)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:3519](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3519)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3520](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3520)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:3521](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3521)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:3522](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3522)

---

### leaseSecret?

> `optional` **leaseSecret?**: `string`

Defined in: [types/proxy.ts:3524](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3524)

Complete-mode only: shared secret the lease signature is keyed by.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:3530](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3530)

Shared secret receipts and netting claims are keyed by. Minted with the
grant and handed to the borrower in the share link; deliberately survives
`share rotate`, so receipts issued under an old token stay checkable.

---

### nettedCoins?

> `optional` **nettedCoins?**: `number`

Defined in: [types/proxy.ts:3532](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3532)

Cumulative coins forgiven by reciprocal netting on this grant.

---

### provisionedAccount?

> `optional` **provisionedAccount?**: `string`

Defined in: [types/proxy.ts:3534](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3534)

Complete-mode only: which of the lender's own accounts was provisioned.

---

### leasePolicy?

> `optional` **leasePolicy?**: `object`

Defined in: [types/proxy.ts:3536](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3536)

Complete-mode lease shape. Absent means the defaults apply.

#### ttlMs

> **ttlMs**: `number`

#### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

#### offlineGraceMs

> **offlineGraceMs**: `number`
