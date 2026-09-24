[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4919)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4920)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4922)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4923)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4924)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4925)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4927)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4928)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4929)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4931)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4932)
