[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

Defined in: [types/proxy.ts:4361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4361)

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4362](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4362)

---

### name

> **name**: `string`

Defined in: [types/proxy.ts:4363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4363)

---

### url

> **url**: `string`

Defined in: [types/proxy.ts:4364](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4364)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:4365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4365)

---

### priority

> **priority**: `number`

Defined in: [types/proxy.ts:4367](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4367)

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:4368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4368)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4369)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4370)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4371)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4372)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/proxy.ts:4373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4373)

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

Defined in: [types/proxy.ts:4374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4374)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

Defined in: [types/proxy.ts:4375](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4375)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Defined in: [types/proxy.ts:4377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4377)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4379)

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Defined in: [types/proxy.ts:4381](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4381)

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Defined in: [types/proxy.ts:4383](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4383)

Highest receipt sequence collected from this lender.
