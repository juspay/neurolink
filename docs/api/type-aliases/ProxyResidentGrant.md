[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4929)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4930)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4932)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4933)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4934)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4935](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4935)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4937](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4937)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4938](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4938)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4939](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4939)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4941](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4941)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4942)
