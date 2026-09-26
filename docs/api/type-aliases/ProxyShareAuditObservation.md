[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditObservation

# Type Alias: ProxyShareAuditObservation

> **ProxyShareAuditObservation** = `object`

One heartbeat's worth of evidence about a complete-mode grant.

The lender cannot see a resident credential's requests — they never touch this
node. What it _can_ see is the account's own utilization, which the provider
reports and the borrower cannot influence. Pairing that with what the borrower
claimed to spend is the whole audit.

## Properties

### at

> **at**: `number`

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

0..1 utilization of the account's 5h window at this heartbeat.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

0..1 utilization of the account's 7d window at this heartbeat.

---

### reportedCoins

> **reportedCoins**: `number`

Coins the borrower reported since the previous heartbeat.

---

### lenderRequests

> **lenderRequests**: `number`

Requests this node itself served on the account **since the previous
observation**. A per-interval delta, not a running total: the drift check
asks whether the lender used the account during this interval.
