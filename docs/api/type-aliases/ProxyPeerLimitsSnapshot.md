[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerLimitsSnapshot

# Type Alias: ProxyPeerLimitsSnapshot

> **ProxyPeerLimitsSnapshot** = `object`

Defined in: [types/proxy.ts:4469](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4469)

What `GET /peer/limits` tells a borrower.

Scoped to the caller's own grant on purpose: it carries no account labels and
no per-account figures, so it cannot be used to describe — or count — the
lender's pool. `null` on a slice means no ceiling is configured for that
window, which is different from a ceiling with nothing left.

## Properties

### grantState

> **grantState**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:4470](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4470)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4471](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4471)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4472](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4472)

---

### remainingCoins?

> `optional` **remainingCoins?**: `number`

Defined in: [types/proxy.ts:4473](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4473)

---

### servable

> **servable**: `boolean`

Defined in: [types/proxy.ts:4475](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4475)

Whether at least one of the lender's accounts can serve this grant now.

---

### withheldReason?

> `optional` **withheldReason?**: [`ProxyShareRefusalReason`](ProxyShareRefusalReason.md)

Defined in: [types/proxy.ts:4476](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4476)

---

### sliceLeftPct

> **sliceLeftPct**: `object`

Defined in: [types/proxy.ts:4477](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4477)

#### session

> **session**: `number` \| `null`

#### weekly

> **weekly**: `number` \| `null`

---

### retryAfterSeconds?

> `optional` **retryAfterSeconds?**: `number`

Defined in: [types/proxy.ts:4481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4481)
