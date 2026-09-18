[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4547](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4547)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4548](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4548)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4550](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4550)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4551](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4551)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4552](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4552)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4553](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4553)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4555](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4555)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4556](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4556)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4557](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4557)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4559](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4559)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4560](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4560)
