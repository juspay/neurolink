[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditObservation

# Type Alias: ProxyShareAuditObservation

> **ProxyShareAuditObservation** = `object`

Defined in: [types/proxy.ts:4202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4202)

One heartbeat's worth of evidence about a complete-mode grant.

The lender cannot see a resident credential's requests — they never touch this
node. What it _can_ see is the account's own utilization, which the provider
reports and the borrower cannot influence. Pairing that with what the borrower
claimed to spend is the whole audit.

## Properties

### at

> **at**: `number`

Defined in: [types/proxy.ts:4203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4203)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4205)

0..1 utilization of the account's 5h window at this heartbeat.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4207](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4207)

0..1 utilization of the account's 7d window at this heartbeat.

---

### reportedCoins

> **reportedCoins**: `number`

Defined in: [types/proxy.ts:4209](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4209)

Coins the borrower reported since the previous heartbeat.

---

### lenderRequests

> **lenderRequests**: `number`

Defined in: [types/proxy.ts:4213](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4213)

Requests this node itself served on the account **since the previous
observation**. A per-interval delta, not a running total: the drift check
asks whether the lender used the account during this interval.
