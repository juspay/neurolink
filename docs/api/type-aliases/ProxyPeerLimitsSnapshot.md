[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerLimitsSnapshot

# Type Alias: ProxyPeerLimitsSnapshot

> **ProxyPeerLimitsSnapshot** = `object`

Defined in: [types/proxy.ts:3822](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3822)

What `GET /peer/limits` tells a borrower.

Scoped to the caller's own grant on purpose: it carries no account labels and
no per-account figures, so it cannot be used to describe — or count — the
lender's pool. `null` on a slice means no ceiling is configured for that
window, which is different from a ceiling with nothing left.

## Properties

### grantState

> **grantState**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:3823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3823)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3824)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3825)

---

### remainingCoins?

> `optional` **remainingCoins?**: `number`

Defined in: [types/proxy.ts:3826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3826)

---

### servable

> **servable**: `boolean`

Defined in: [types/proxy.ts:3828](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3828)

Whether at least one of the lender's accounts can serve this grant now.

---

### withheldReason?

> `optional` **withheldReason?**: [`ProxyShareRefusalReason`](ProxyShareRefusalReason.md)

Defined in: [types/proxy.ts:3829](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3829)

---

### sliceLeftPct

> **sliceLeftPct**: `object`

Defined in: [types/proxy.ts:3830](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3830)

#### session

> **session**: `number` \| `null`

#### weekly

> **weekly**: `number` \| `null`

---

### retryAfterSeconds?

> `optional` **retryAfterSeconds?**: `number`

Defined in: [types/proxy.ts:3834](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3834)
