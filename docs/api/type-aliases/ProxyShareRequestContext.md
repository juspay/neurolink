[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Defined in: [types/proxy.ts:4173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4173)

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4174)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4175)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4176](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4176)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4177)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4178)

---

### holdId?

> `optional` **holdId?**: `string`

Defined in: [types/proxy.ts:4180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4180)

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4182)

Model the borrower asked for, carried so settlement can price it.
