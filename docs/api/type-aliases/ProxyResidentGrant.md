[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4077](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4077)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4078](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4078)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4080](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4080)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4081](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4081)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4082](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4082)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4083](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4083)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4085](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4085)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4086](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4086)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4087)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4089](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4089)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4090](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4090)
