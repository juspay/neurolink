[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

Defined in: [types/proxy.ts:4609](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4609)

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4610](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4610)

---

### name

> **name**: `string`

Defined in: [types/proxy.ts:4611](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4611)

---

### url

> **url**: `string`

Defined in: [types/proxy.ts:4612](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4612)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:4613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4613)

---

### priority

> **priority**: `number`

Defined in: [types/proxy.ts:4615](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4615)

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:4616](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4616)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4617)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4618)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4619)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4620)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/proxy.ts:4621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4621)

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

Defined in: [types/proxy.ts:4622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4622)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

Defined in: [types/proxy.ts:4623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4623)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Defined in: [types/proxy.ts:4625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4625)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4627)

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Defined in: [types/proxy.ts:4629](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4629)

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Defined in: [types/proxy.ts:4631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4631)

Highest receipt sequence collected from this lender.
