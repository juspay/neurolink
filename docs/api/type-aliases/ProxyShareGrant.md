[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrant

# Type Alias: ProxyShareGrant

> **ProxyShareGrant** = `object`

Defined in: [types/proxy.ts:4177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4177)

One lender-issued authorization for one borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4178)

---

### id

> **id**: `string`

Defined in: [types/proxy.ts:4179](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4179)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4180)

---

### tokenHash

> **tokenHash**: `string`

Defined in: [types/proxy.ts:4182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4182)

sha256(salt + token). The token itself is never persisted.

---

### tokenSalt

> **tokenSalt**: `string`

Defined in: [types/proxy.ts:4183](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4183)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4184)

---

### state

> **state**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:4185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4185)

---

### entitlement

> **entitlement**: [`ProxyShareEntitlement`](ProxyShareEntitlement.md)

Defined in: [types/proxy.ts:4186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4186)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4187)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4188)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4189)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4190](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4190)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4191)

---

### leaseSecret?

> `optional` **leaseSecret?**: `string`

Defined in: [types/proxy.ts:4193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4193)

Complete-mode only: shared secret the lease signature is keyed by.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4199)

Shared secret receipts and netting claims are keyed by. Minted with the
grant and handed to the borrower in the share link; deliberately survives
`share rotate`, so receipts issued under an old token stay checkable.

---

### nettedCoins?

> `optional` **nettedCoins?**: `number`

Defined in: [types/proxy.ts:4201](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4201)

Cumulative coins forgiven by reciprocal netting on this grant.

---

### provisionedAccount?

> `optional` **provisionedAccount?**: `string`

Defined in: [types/proxy.ts:4203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4203)

Complete-mode only: which of the lender's own accounts was provisioned.

---

### leasePolicy?

> `optional` **leasePolicy?**: `object`

Defined in: [types/proxy.ts:4205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4205)

Complete-mode lease shape. Absent means the defaults apply.

#### ttlMs

> **ttlMs**: `number`

#### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

#### offlineGraceMs

> **offlineGraceMs**: `number`
