[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4184)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4185)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4187)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4188)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4189)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4190](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4190)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4192](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4192)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4193)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4194](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4194)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4196)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4197)
