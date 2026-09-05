[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareGates

# Type Alias: ProxyShareGates

> **ProxyShareGates** = `object`

Defined in: [types/proxy.ts:3472](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3472)

The gate set. Every configured gate must pass; the effective allowance is the
minimum across all of them. Gates are deliberately orthogonal so a headroom
grant can also carry a window-slice ceiling, a spillover grant can also carry
a model allowlist, and so on.

## Properties

### maxSlice?

> `optional` **maxSlice?**: [`ProxyShareWindowSlice`](ProxyShareWindowSlice.md)

Defined in: [types/proxy.ts:3477](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3477)

Hard ceiling on how much of the **pool** the borrower may consume, as a
percentage of one window's worth of capacity. Pool-wide because an
operator saying "a fifth" means a fifth of what they have, not a fifth of
every credential they happen to own.

---

### maxSlicePerAccount?

> `optional` **maxSlicePerAccount?**: [`ProxyShareWindowSlice`](ProxyShareWindowSlice.md)

Defined in: [types/proxy.ts:3480](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3480)

Per-account ceiling. Rare — reach for `maxSlice` unless you specifically
mean "this much of every credential, independently".

---

### reserveFloor?

> `optional` **reserveFloor?**: [`ProxyShareWindowSlice`](ProxyShareWindowSlice.md)

Defined in: [types/proxy.ts:3482](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3482)

Admit only while the lender's own utilization leaves this much headroom.

---

### spillover?

> `optional` **spillover?**: [`ProxyShareSpilloverGate`](ProxyShareSpilloverGate.md)

Defined in: [types/proxy.ts:3483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3483)

---

### models?

> `optional` **models?**: `string`[]

Defined in: [types/proxy.ts:3485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3485)

Model tier allowlist, matched case-insensitively as substrings.

---

### accounts?

> `optional` **accounts?**: `string`[]

Defined in: [types/proxy.ts:3487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3487)

Which of the lender's accounts are lendable under this grant.

---

### rate?

> `optional` **rate?**: [`ProxyShareRate`](ProxyShareRate.md)

Defined in: [types/proxy.ts:3488](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3488)

---

### schedule?

> `optional` **schedule?**: [`ProxyShareSchedule`](ProxyShareSchedule.md)

Defined in: [types/proxy.ts:3489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3489)

---

### notAfter?

> `optional` **notAfter?**: `number`

Defined in: [types/proxy.ts:3491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3491)

Grant expiry, epoch ms.
