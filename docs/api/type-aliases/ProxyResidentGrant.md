[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4794](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4794)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4795](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4795)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4797](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4797)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4798](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4798)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4799](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4799)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4800](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4800)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4802](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4802)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4803](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4803)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4804](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4804)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4806](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4806)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4807](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4807)
