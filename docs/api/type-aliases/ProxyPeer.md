[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

Defined in: [types/proxy.ts:4382](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4382)

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4383](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4383)

---

### name

> **name**: `string`

Defined in: [types/proxy.ts:4384](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4384)

---

### url

> **url**: `string`

Defined in: [types/proxy.ts:4385](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4385)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:4386](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4386)

---

### priority

> **priority**: `number`

Defined in: [types/proxy.ts:4388](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4388)

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:4389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4389)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4390)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4391](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4391)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4392](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4392)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4393](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4393)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/proxy.ts:4394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4394)

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

Defined in: [types/proxy.ts:4395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4395)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

Defined in: [types/proxy.ts:4396](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4396)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Defined in: [types/proxy.ts:4398](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4398)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4400](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4400)

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Defined in: [types/proxy.ts:4402](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4402)

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Defined in: [types/proxy.ts:4404](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4404)

Highest receipt sequence collected from this lender.
