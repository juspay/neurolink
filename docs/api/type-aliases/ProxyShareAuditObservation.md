[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditObservation

# Type Alias: ProxyShareAuditObservation

> **ProxyShareAuditObservation** = `object`

Defined in: [types/proxy.ts:4217](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4217)

One heartbeat's worth of evidence about a complete-mode grant.

The lender cannot see a resident credential's requests — they never touch this
node. What it _can_ see is the account's own utilization, which the provider
reports and the borrower cannot influence. Pairing that with what the borrower
claimed to spend is the whole audit.

## Properties

### at

> **at**: `number`

Defined in: [types/proxy.ts:4218](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4218)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4220](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4220)

0..1 utilization of the account's 5h window at this heartbeat.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4222](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4222)

0..1 utilization of the account's 7d window at this heartbeat.

---

### reportedCoins

> **reportedCoins**: `number`

Defined in: [types/proxy.ts:4224](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4224)

Coins the borrower reported since the previous heartbeat.

---

### lenderRequests

> **lenderRequests**: `number`

Defined in: [types/proxy.ts:4228](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4228)

Requests this node itself served on the account **since the previous
observation**. A per-interval delta, not a running total: the drift check
asks whether the lender used the account during this interval.
