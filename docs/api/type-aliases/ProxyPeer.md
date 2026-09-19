[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

Defined in: [types/proxy.ts:4512](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4512)

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4513](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4513)

---

### name

> **name**: `string`

Defined in: [types/proxy.ts:4514](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4514)

---

### url

> **url**: `string`

Defined in: [types/proxy.ts:4515](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4515)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:4516](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4516)

---

### priority

> **priority**: `number`

Defined in: [types/proxy.ts:4518](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4518)

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:4519](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4519)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4520](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4520)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4521](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4521)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4522](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4522)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4523](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4523)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/proxy.ts:4524](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4524)

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

Defined in: [types/proxy.ts:4525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4525)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

Defined in: [types/proxy.ts:4526](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4526)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Defined in: [types/proxy.ts:4528](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4528)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4530](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4530)

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Defined in: [types/proxy.ts:4532](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4532)

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Defined in: [types/proxy.ts:4534](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4534)

Highest receipt sequence collected from this lender.
