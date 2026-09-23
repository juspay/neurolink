[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareEntitlement

# Type Alias: ProxyShareEntitlement

> **ProxyShareEntitlement** = `object`

Defined in: [types/proxy.ts:4092](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4092)

## Properties

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4093)

---

### coins?

> `optional` **coins?**: `number`

Defined in: [types/proxy.ts:4095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4095)

Remaining balance when `ledger` is "coins".

---

### refill?

> `optional` **refill?**: `object`

Defined in: [types/proxy.ts:4096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4096)

#### amount

> **amount**: `number`

#### per

> **per**: [`ProxyShareRefillPeriod`](ProxyShareRefillPeriod.md)

#### lastAt?

> `optional` **lastAt?**: `number`
