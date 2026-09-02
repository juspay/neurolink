[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4169)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4170)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4172)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4173)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4174)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4175)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4177)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4178)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4179](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4179)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4181](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4181)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4182)
