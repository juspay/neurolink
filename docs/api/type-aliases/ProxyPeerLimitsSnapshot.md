[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerLimitsSnapshot

# Type Alias: ProxyPeerLimitsSnapshot

> **ProxyPeerLimitsSnapshot** = `object`

Defined in: [types/proxy.ts:4594](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4594)

What `GET /peer/limits` tells a borrower.

Scoped to the caller's own grant on purpose: it carries no account labels and
no per-account figures, so it cannot be used to describe — or count — the
lender's pool. `null` on a slice means no ceiling is configured for that
window, which is different from a ceiling with nothing left.

## Properties

### grantState

> **grantState**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:4595](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4595)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4596](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4596)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4597](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4597)

---

### remainingCoins?

> `optional` **remainingCoins?**: `number`

Defined in: [types/proxy.ts:4598](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4598)

---

### servable

> **servable**: `boolean`

Defined in: [types/proxy.ts:4600](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4600)

Whether at least one of the lender's accounts can serve this grant now.

---

### withheldReason?

> `optional` **withheldReason?**: [`ProxyShareRefusalReason`](ProxyShareRefusalReason.md)

Defined in: [types/proxy.ts:4601](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4601)

---

### sliceLeftPct

> **sliceLeftPct**: `object`

Defined in: [types/proxy.ts:4602](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4602)

#### session

> **session**: `number` \| `null`

#### weekly

> **weekly**: `number` \| `null`

---

### retryAfterSeconds?

> `optional` **retryAfterSeconds?**: `number`

Defined in: [types/proxy.ts:4606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4606)
