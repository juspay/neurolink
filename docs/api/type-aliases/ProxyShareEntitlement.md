[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareEntitlement

# Type Alias: ProxyShareEntitlement

> **ProxyShareEntitlement** = `object`

Defined in: [types/proxy.ts:4165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4165)

## Properties

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4166](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4166)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/proxy.ts:4168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4168)

Remaining balance when `ledger` is "coins".

---

### refill?

> `optional` **refill?**: `object`

Defined in: [types/proxy.ts:4169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4169)

#### amount

> **amount**: `number`

#### per

> **per**: [`ProxyShareRefillPeriod`](ProxyShareRefillPeriod.md)

#### lastAt?

> `optional` **lastAt?**: `number`
