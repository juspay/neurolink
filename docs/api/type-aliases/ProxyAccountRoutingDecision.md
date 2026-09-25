[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountRoutingDecision

# Type Alias: ProxyAccountRoutingDecision

> **ProxyAccountRoutingDecision** = `object`

Defined in: [types/proxy.ts:643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L643)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L644)

---

### evaluatedAt

> **evaluatedAt**: `string`

Defined in: [types/proxy.ts:645](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L645)

---

### strategy

> **strategy**: [`ProxyAccountRoutingStrategy`](ProxyAccountRoutingStrategy.md)

Defined in: [types/proxy.ts:646](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L646)

---

### mode

> **mode**: [`ProxyAccountRoutingMode`](ProxyAccountRoutingMode.md)

Defined in: [types/proxy.ts:647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L647)

---

### selectionReason

> **selectionReason**: [`ProxyAccountRoutingReason`](ProxyAccountRoutingReason.md)

Defined in: [types/proxy.ts:648](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L648)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:649](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L649)

---

### quotaInputsUsed

> **quotaInputsUsed**: `boolean`

Defined in: [types/proxy.ts:650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L650)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L651)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:652](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L652)

---

### configuredPrimaryAccount

> **configuredPrimaryAccount**: `string` \| `null`

Defined in: [types/proxy.ts:653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L653)

---

### configuredPrimaryMatched

> **configuredPrimaryMatched**: `boolean`

Defined in: [types/proxy.ts:654](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L654)

---

### rotationOffset

> **rotationOffset**: `number`

Defined in: [types/proxy.ts:655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L655)

---

### initialAccount

> **initialAccount**: `string`

Defined in: [types/proxy.ts:656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L656)

---

### candidates

> **candidates**: [`ProxyAccountRoutingCandidate`](ProxyAccountRoutingCandidate.md)[]

Defined in: [types/proxy.ts:657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L657)

---

### policy?

> `optional` **policy?**: [`ProxyRoutingPolicySnapshot`](ProxyRoutingPolicySnapshot.md)

Defined in: [types/proxy.ts:658](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L658)

---

### affinity?

> `optional` **affinity?**: [`ProxyAccountRoutingAffinityEvidence`](ProxyAccountRoutingAffinityEvidence.md)

Defined in: [types/proxy.ts:659](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L659)

---

### spill?

> `optional` **spill?**: [`ProxyAccountRoutingSpillEvidence`](ProxyAccountRoutingSpillEvidence.md)

Defined in: [types/proxy.ts:660](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L660)
