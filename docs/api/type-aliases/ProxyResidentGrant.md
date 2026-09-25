[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4867](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4867)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4868](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4868)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4870)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4871)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4872)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4873)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4875)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4876](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4876)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4877](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4877)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4879)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4880](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4880)
