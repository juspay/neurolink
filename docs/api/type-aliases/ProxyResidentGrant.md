[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

Defined in: [types/proxy.ts:4178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4178)

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4179](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4179)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4181](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4181)

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4182)

---

### lenderName

> **lenderName**: `string`

Defined in: [types/proxy.ts:4183](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4183)

---

### lenderUrl

> **lenderUrl**: `string`

Defined in: [types/proxy.ts:4184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4184)

---

### leaseSecret

> **leaseSecret**: `string`

Defined in: [types/proxy.ts:4186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4186)

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

Defined in: [types/proxy.ts:4187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4187)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

Defined in: [types/proxy.ts:4188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4188)

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Defined in: [types/proxy.ts:4190](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4190)

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`

Defined in: [types/proxy.ts:4191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4191)
