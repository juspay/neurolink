[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerLimitsSnapshot

# Type Alias: ProxyPeerLimitsSnapshot

> **ProxyPeerLimitsSnapshot** = `object`

Defined in: [types/proxy.ts:4544](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4544)

What `GET /peer/limits` tells a borrower.

Scoped to the caller's own grant on purpose: it carries no account labels and
no per-account figures, so it cannot be used to describe — or count — the
lender's pool. `null` on a slice means no ceiling is configured for that
window, which is different from a ceiling with nothing left.

## Properties

### grantState

> **grantState**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:4545](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4545)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4546](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4546)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4547](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4547)

---

### remainingCoins?

> `optional` **remainingCoins?**: `number`

Defined in: [types/proxy.ts:4548](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4548)

---

### servable

> **servable**: `boolean`

Defined in: [types/proxy.ts:4550](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4550)

Whether at least one of the lender's accounts can serve this grant now.

---

### withheldReason?

> `optional` **withheldReason?**: [`ProxyShareRefusalReason`](ProxyShareRefusalReason.md)

Defined in: [types/proxy.ts:4551](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4551)

---

### sliceLeftPct

> **sliceLeftPct**: `object`

Defined in: [types/proxy.ts:4552](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4552)

#### session

> **session**: `number` \| `null`

#### weekly

> **weekly**: `number` \| `null`

---

### retryAfterSeconds?

> `optional` **retryAfterSeconds?**: `number`

Defined in: [types/proxy.ts:4556](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4556)
