[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4147)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4148)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4150](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4150)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4151)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4152](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4152)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4153](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4153)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4155](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4155)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4156](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4156)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4157)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4159)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4160)
