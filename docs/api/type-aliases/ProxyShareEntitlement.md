[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareEntitlement

# Type Alias: ProxyShareEntitlement

> **ProxyShareEntitlement** = `object`

Defined in: [types/proxy.ts:4072](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4072)

## Properties

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4073)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/proxy.ts:4075](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4075)

Remaining balance when `ledger` is "coins".

---

### refill?

> `optional` **refill?**: `object`

Defined in: [types/proxy.ts:4076](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4076)

#### amount

> **amount**: `number`

#### per

> **per**: [`ProxyShareRefillPeriod`](ProxyShareRefillPeriod.md)

#### lastAt?

> `optional` **lastAt?**: `number`
