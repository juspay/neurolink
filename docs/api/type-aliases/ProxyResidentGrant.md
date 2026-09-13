[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4397)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4398](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4398)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4400](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4400)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4401](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4401)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4402](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4402)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4403](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4403)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4405](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4405)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4406](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4406)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4407](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4407)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4409](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4409)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4410](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4410)
