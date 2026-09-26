[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

---

### name

> **name**: `string`

---

### url

> **url**: `string`

---

### token

> **token**: `string`

---

### priority

> **priority**: `number`

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

---

### createdAt

> **createdAt**: `number`

---

### updatedAt

> **updatedAt**: `number`

---

### note?

> `optional` **note?**: `string`

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Highest receipt sequence collected from this lender.
