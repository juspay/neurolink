[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4677)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4678)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4680)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4681)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4682)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4683)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4685)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4686)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4687)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4689)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4690)
