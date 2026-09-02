[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareEntitlement

# Type Alias: ProxyShareEntitlement

> **ProxyShareEntitlement** = `object`

Defined in: [types/proxy.ts:3467](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3467)

## Properties

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3468](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3468)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/proxy.ts:3470](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3470)

Remaining balance when `ledger` is "coins".

---

### refill?

> `optional` **refill?**: `object`

Defined in: [types/proxy.ts:3471](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3471)

#### amount

> **amount**: `number`

#### per

> **per**: [`ProxyShareRefillPeriod`](ProxyShareRefillPeriod.md)

#### lastAt?

> `optional` **lastAt?**: `number`
