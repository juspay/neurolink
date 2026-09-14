[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4508](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4508)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4509](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4509)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4511](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4511)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4512](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4512)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4513](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4513)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4514](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4514)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4516](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4516)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4517](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4517)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4518](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4518)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4520](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4520)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4521](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4521)
