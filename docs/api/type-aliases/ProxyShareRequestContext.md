[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRequestContext

# Type Alias: ProxyShareRequestContext

> **ProxyShareRequestContext** = `object`

Defined in: [types/proxy.ts:3583](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3583)

Request-scoped view of the grant serving the current borrowed request.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3584](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3584)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:3585](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3585)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3586](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3586)

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:3587](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3587)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3588](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3588)

---

### holdId?

> `optional` **holdId?**: `string`

Defined in: [types/proxy.ts:3590](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3590)

Pre-authorization opened at admission; settlement closes it.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3592](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3592)

Model the borrower asked for, carried so settlement can price it.
