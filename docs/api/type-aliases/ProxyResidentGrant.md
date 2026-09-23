[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4774)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4775](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4775)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4777](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4777)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4778](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4778)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4779](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4779)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4780)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4782](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4782)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4783](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4783)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4784](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4784)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4786](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4786)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4787](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4787)
