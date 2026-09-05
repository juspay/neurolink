[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4198)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4199)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4201](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4201)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4202)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4203)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4204)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4206](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4206)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4207](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4207)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4208)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4210](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4210)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4211](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4211)
