[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrant

# Type Alias: ProxyShareGrant

> **ProxyShareGrant** = `object`

Defined in: [types/proxy.ts:3987](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3987)

One lender-issued authorization for one borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3988](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3988)

---

### id

> **id**: `string`

Defined in: [types/proxy.ts:3989](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3989)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3990](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3990)

---

### tokenHash

> **tokenHash**: `string`

Defined in: [types/proxy.ts:3992](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3992)

sha256(salt + token). The token itself is never persisted.

---

### tokenSalt

> **tokenSalt**: `string`

Defined in: [types/proxy.ts:3993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3993)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3994)

---

### state

> **state**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:3995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3995)

---

### entitlement

> **entitlement**: [`ProxyShareEntitlement`](ProxyShareEntitlement.md)

Defined in: [types/proxy.ts:3996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3996)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3997](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3997)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:3998](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3998)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3999](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3999)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4000)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4001](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4001)

---

### leaseSecret?

> `optional` **leaseSecret?**: `string`

Defined in: [types/proxy.ts:4003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4003)

Complete-mode only: shared secret the lease signature is keyed by.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4009](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4009)

Shared secret receipts and netting claims are keyed by. Minted with the
grant and handed to the borrower in the share link; deliberately survives
`share rotate`, so receipts issued under an old token stay checkable.

---

### nettedCoins?

> `optional` **nettedCoins?**: `number`

Defined in: [types/proxy.ts:4011](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4011)

Cumulative coins forgiven by reciprocal netting on this grant.

---

### provisionedAccount?

> `optional` **provisionedAccount?**: `string`

Defined in: [types/proxy.ts:4013](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4013)

Complete-mode only: which of the lender's own accounts was provisioned.

---

### leasePolicy?

> `optional` **leasePolicy?**: `object`

Defined in: [types/proxy.ts:4015](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4015)

Complete-mode lease shape. Absent means the defaults apply.

#### ttlMs

> **ttlMs**: `number`

#### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

#### offlineGraceMs

> **offlineGraceMs**: `number`
