[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrant

# Type Alias: ProxyShareGrant

> **ProxyShareGrant** = `object`

Defined in: [types/proxy.ts:4107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4107)

One lender-issued authorization for one borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4108)

---

### id

> **id**: `string`

Defined in: [types/proxy.ts:4109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4109)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4110](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4110)

---

### tokenHash

> **tokenHash**: `string`

Defined in: [types/proxy.ts:4112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4112)

sha256(salt + token). The token itself is never persisted.

---

### tokenSalt

> **tokenSalt**: `string`

Defined in: [types/proxy.ts:4113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4113)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4114)

---

### state

> **state**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:4115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4115)

---

### entitlement

> **entitlement**: [`ProxyShareEntitlement`](ProxyShareEntitlement.md)

Defined in: [types/proxy.ts:4116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4116)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4117)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4118)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4119)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4120)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4121)

---

### leaseSecret?

> `optional` **leaseSecret?**: `string`

Defined in: [types/proxy.ts:4123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4123)

Complete-mode only: shared secret the lease signature is keyed by.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4129)

Shared secret receipts and netting claims are keyed by. Minted with the
grant and handed to the borrower in the share link; deliberately survives
`share rotate`, so receipts issued under an old token stay checkable.

---

### nettedCoins?

> `optional` **nettedCoins?**: `number`

Defined in: [types/proxy.ts:4131](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4131)

Cumulative coins forgiven by reciprocal netting on this grant.

---

### provisionedAccount?

> `optional` **provisionedAccount?**: `string`

Defined in: [types/proxy.ts:4133](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4133)

Complete-mode only: which of the lender's own accounts was provisioned.

---

### leasePolicy?

> `optional` **leasePolicy?**: `object`

Defined in: [types/proxy.ts:4135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4135)

Complete-mode lease shape. Absent means the defaults apply.

#### ttlMs

> **ttlMs**: `number`

#### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

#### offlineGraceMs

> **offlineGraceMs**: `number`
