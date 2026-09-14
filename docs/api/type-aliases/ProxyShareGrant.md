[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrant

# Type Alias: ProxyShareGrant

> **ProxyShareGrant** = `object`

Defined in: [types/proxy.ts:3818](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3818)

One lender-issued authorization for one borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3819](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3819)

---

### id

> **id**: `string`

Defined in: [types/proxy.ts:3820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3820)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3821)

---

### tokenHash

> **tokenHash**: `string`

Defined in: [types/proxy.ts:3823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3823)

sha256(salt + token). The token itself is never persisted.

---

### tokenSalt

> **tokenSalt**: `string`

Defined in: [types/proxy.ts:3824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3824)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3825)

---

### state

> **state**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:3826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3826)

---

### entitlement

> **entitlement**: [`ProxyShareEntitlement`](ProxyShareEntitlement.md)

Defined in: [types/proxy.ts:3827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3827)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3828](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3828)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:3829](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3829)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3830](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3830)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:3831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3831)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:3832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3832)

---

### leaseSecret?

> `optional` **leaseSecret?**: `string`

Defined in: [types/proxy.ts:3834](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3834)

Complete-mode only: shared secret the lease signature is keyed by.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:3840](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3840)

Shared secret receipts and netting claims are keyed by. Minted with the
grant and handed to the borrower in the share link; deliberately survives
`share rotate`, so receipts issued under an old token stay checkable.

---

### nettedCoins?

> `optional` **nettedCoins?**: `number`

Defined in: [types/proxy.ts:3842](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3842)

Cumulative coins forgiven by reciprocal netting on this grant.

---

### provisionedAccount?

> `optional` **provisionedAccount?**: `string`

Defined in: [types/proxy.ts:3844](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3844)

Complete-mode only: which of the lender's own accounts was provisioned.

---

### leasePolicy?

> `optional` **leasePolicy?**: `object`

Defined in: [types/proxy.ts:3846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3846)

Complete-mode lease shape. Absent means the defaults apply.

#### ttlMs

> **ttlMs**: `number`

#### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

#### offlineGraceMs

> **offlineGraceMs**: `number`
