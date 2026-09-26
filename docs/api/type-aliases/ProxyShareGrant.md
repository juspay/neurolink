[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrant

# Type Alias: ProxyShareGrant

> **ProxyShareGrant** = `object`

Defined in: [types/proxy.ts:4239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4239)

One lender-issued authorization for one borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4240)

---

### id

> **id**: `string`

Defined in: [types/proxy.ts:4241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4241)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4242](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4242)

---

### tokenHash

> **tokenHash**: `string`

Defined in: [types/proxy.ts:4244](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4244)

sha256(salt + token). The token itself is never persisted.

---

### tokenSalt

> **tokenSalt**: `string`

Defined in: [types/proxy.ts:4245](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4245)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4246](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4246)

---

### state

> **state**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:4247](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4247)

---

### entitlement

> **entitlement**: [`ProxyShareEntitlement`](ProxyShareEntitlement.md)

Defined in: [types/proxy.ts:4248](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4248)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4249)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4250)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4251)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4252](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4252)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4253)

---

### leaseSecret?

> `optional` **leaseSecret?**: `string`

Defined in: [types/proxy.ts:4255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4255)

Complete-mode only: shared secret the lease signature is keyed by.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4261)

Shared secret receipts and netting claims are keyed by. Minted with the
grant and handed to the borrower in the share link; deliberately survives
`share rotate`, so receipts issued under an old token stay checkable.

---

### nettedCoins?

> `optional` **nettedCoins?**: `number`

Defined in: [types/proxy.ts:4263](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4263)

Cumulative coins forgiven by reciprocal netting on this grant.

---

### provisionedAccount?

> `optional` **provisionedAccount?**: `string`

Defined in: [types/proxy.ts:4265](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4265)

Complete-mode only: which of the lender's own accounts was provisioned.

---

### leasePolicy?

> `optional` **leasePolicy?**: `object`

Defined in: [types/proxy.ts:4267](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4267)

Complete-mode lease shape. Absent means the defaults apply.

#### ttlMs

> **ttlMs**: `number`

#### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

#### offlineGraceMs

> **offlineGraceMs**: `number`
