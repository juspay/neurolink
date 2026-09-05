[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerLimitsSnapshot

# Type Alias: ProxyPeerLimitsSnapshot

> **ProxyPeerLimitsSnapshot** = `object`

Defined in: [types/proxy.ts:3873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3873)

What `GET /peer/limits` tells a borrower.

Scoped to the caller's own grant on purpose: it carries no account labels and
no per-account figures, so it cannot be used to describe — or count — the
lender's pool. `null` on a slice means no ceiling is configured for that
window, which is different from a ceiling with nothing left.

## Properties

### grantState

> **grantState**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:3874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3874)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:3875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3875)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:3876](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3876)

---

### remainingCoins?

> `optional` **remainingCoins?**: `number`

Defined in: [types/proxy.ts:3877](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3877)

---

### servable

> **servable**: `boolean`

Defined in: [types/proxy.ts:3879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3879)

Whether at least one of the lender's accounts can serve this grant now.

---

### withheldReason?

> `optional` **withheldReason?**: [`ProxyShareRefusalReason`](ProxyShareRefusalReason.md)

Defined in: [types/proxy.ts:3880](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3880)

---

### sliceLeftPct

> **sliceLeftPct**: `object`

Defined in: [types/proxy.ts:3881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3881)

#### session

> **session**: `number` \| `null`

#### weekly

> **weekly**: `number` \| `null`

---

### retryAfterSeconds?

> `optional` **retryAfterSeconds?**: `number`

Defined in: [types/proxy.ts:3885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3885)
