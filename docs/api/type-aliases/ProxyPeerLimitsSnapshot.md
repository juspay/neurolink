[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeerLimitsSnapshot

# Type Alias: ProxyPeerLimitsSnapshot

> **ProxyPeerLimitsSnapshot** = `object`

Defined in: [types/proxy.ts:4542](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4542)

What `GET /peer/limits` tells a borrower.

Scoped to the caller's own grant on purpose: it carries no account labels and
no per-account figures, so it cannot be used to describe — or count — the
lender's pool. `null` on a slice means no ceiling is configured for that
window, which is different from a ceiling with nothing left.

## Properties

### grantState

> **grantState**: [`ProxyShareGrantState`](ProxyShareGrantState.md)

Defined in: [types/proxy.ts:4543](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4543)

---

### level

> **level**: [`ProxyShareLevel`](ProxyShareLevel.md)

Defined in: [types/proxy.ts:4544](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4544)

---

### ledger

> **ledger**: [`ProxyShareLedgerMode`](ProxyShareLedgerMode.md)

Defined in: [types/proxy.ts:4545](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4545)

---

### remainingCoins?

> `optional` **remainingCoins?**: `number`

Defined in: [types/proxy.ts:4546](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4546)

---

### servable

> **servable**: `boolean`

Defined in: [types/proxy.ts:4548](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4548)

Whether at least one of the lender's accounts can serve this grant now.

---

### withheldReason?

> `optional` **withheldReason?**: [`ProxyShareRefusalReason`](ProxyShareRefusalReason.md)

Defined in: [types/proxy.ts:4549](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4549)

---

### sliceLeftPct

> **sliceLeftPct**: `object`

Defined in: [types/proxy.ts:4550](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4550)

#### session

> **session**: `number` \| `null`

#### weekly

> **weekly**: `number` \| `null`

---

### retryAfterSeconds?

> `optional` **retryAfterSeconds?**: `number`

Defined in: [types/proxy.ts:4554](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4554)
