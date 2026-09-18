[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareEntitlement

# Type Alias: ProxyShareEntitlement

> **ProxyShareEntitlement** = `object`

Defined in: [types/proxy.ts:3845](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3845)

## Properties

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3846)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/proxy.ts:3848](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3848)

Remaining balance when `ledger` is "coins".

---

### refill?

> `optional` **refill?**: `object`

Defined in: [types/proxy.ts:3849](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3849)

#### amount

> **amount**: `number`

#### per

> **per**: [`ProxyShareRefillPeriod`](ProxyShareRefillPeriod.md)

#### lastAt?

> `optional` **lastAt?**: `number`
