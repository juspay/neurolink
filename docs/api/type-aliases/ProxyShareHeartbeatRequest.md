[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareHeartbeatRequest

# Type Alias: ProxyShareHeartbeatRequest

> **ProxyShareHeartbeatRequest** = `object`

What a borrower sends when checking in.

## Properties

### grantId

> **grantId**: `string`

---

### coinsSpent?

> `optional` **coinsSpent?**: `number`

Coins the borrower believes it has spent since the last heartbeat.

---

### requests?

> `optional` **requests?**: `number`

---

### reportedAt

> **reportedAt**: `number`

Borrower's clock, for drift diagnostics only.
