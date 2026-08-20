[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGrant

# Type Alias: ProxyShareGrant

> **ProxyShareGrant** = `object`

Defined in: [types/proxy.ts:3387](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3387)

One lender-issued authorization for one borrower.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3388](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3388)

---

### id

> **id**: `string`

Defined in: [types/proxy.ts:3389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3389)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3390)

---

### tokenHash

> **tokenHash**: `string`

Defined in: [types/proxy.ts:3392](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3392)

sha256(salt + token). The token itself is never persisted.

---

### tokenSalt

> **tokenSalt**: `string`

Defined in: [types/proxy.ts:3393](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3393)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3394)

---

### state

> **state**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:3395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3395)

---

### entitlement

> **entitlement**: [`ProxyShareEntitlement`](ProxyShareEntitlement.md)

Defined in: [types/proxy.ts:3396](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3396)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3397)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:3398](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3398)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3399](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3399)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:3400](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3400)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:3401](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3401)

---

### leaseSecret?

> `optional` **leaseSecret?**: `string`

Defined in: [types/proxy.ts:3403](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3403)

Complete-mode only: shared secret the lease signature is keyed by.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:3409](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3409)

Shared secret receipts and netting claims are keyed by. Minted with the
grant and handed to the borrower in the share link; deliberately survives
`share rotate`, so receipts issued under an old token stay checkable.

---

### nettedCoins?

> `optional` **nettedCoins?**: `number`

Defined in: [types/proxy.ts:3411](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3411)

Cumulative coins forgiven by reciprocal netting on this grant.

---

### provisionedAccount?

> `optional` **provisionedAccount?**: `string`

Defined in: [types/proxy.ts:3413](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3413)

Complete-mode only: which of the lender's own accounts was provisioned.

---

### leasePolicy?

> `optional` **leasePolicy?**: `object`

Defined in: [types/proxy.ts:3415](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3415)

Complete-mode lease shape. Absent means the defaults apply.

#### ttlMs

> **ttlMs**: `number`

#### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

#### offlineGraceMs

> **offlineGraceMs**: `number`
