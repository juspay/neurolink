[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4522](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4522)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4523](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4523)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4525)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4526](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4526)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4527](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4527)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4528](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4528)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4530](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4530)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4531](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4531)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4532](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4532)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4534](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4534)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4535](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4535)
