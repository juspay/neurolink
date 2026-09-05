[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareEntitlement

# Type Alias: ProxyShareEntitlement

> **ProxyShareEntitlement** = `object`

Defined in: [types/proxy.ts:3496](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3496)

## Properties

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3497)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/proxy.ts:3499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3499)

Remaining balance when `ledger` is "coins".

---

### refill?

> `optional` **refill?**: `object`

Defined in: [types/proxy.ts:3500](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3500)

#### amount

> **amount**: `number`

#### per

> **per**: [`ProxyShareRefillPeriod`](ProxyShareRefillPeriod.md)

#### lastAt?

> `optional` **lastAt?**: `number`
