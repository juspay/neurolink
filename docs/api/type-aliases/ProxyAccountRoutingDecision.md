[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountRoutingDecision

# Type Alias: ProxyAccountRoutingDecision

> **ProxyAccountRoutingDecision** = `object`

## Properties

### schemaVersion

> **schemaVersion**: `1`

---

### evaluatedAt

> **evaluatedAt**: `string`

---

### strategy

> **strategy**: [`ProxyAccountRoutingStrategy`](ProxyAccountRoutingStrategy.md)

---

### mode

> **mode**: [`ProxyAccountRoutingMode`](ProxyAccountRoutingMode.md)

---

### selectionReason

> **selectionReason**: [`ProxyAccountRoutingReason`](ProxyAccountRoutingReason.md)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

---

### quotaInputsUsed

> **quotaInputsUsed**: `boolean`

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

---

### configuredPrimaryAccount

> **configuredPrimaryAccount**: `string` \| `null`

---

### configuredPrimaryMatched

> **configuredPrimaryMatched**: `boolean`

---

### rotationOffset

> **rotationOffset**: `number`

---

### initialAccount

> **initialAccount**: `string`

---

### candidates

> **candidates**: [`ProxyAccountRoutingCandidate`](ProxyAccountRoutingCandidate.md)[]

---

### policy?

> `optional` **policy?**: [`ProxyRoutingPolicySnapshot`](ProxyRoutingPolicySnapshot.md)

---

### affinity?

> `optional` **affinity?**: [`ProxyAccountRoutingAffinityEvidence`](ProxyAccountRoutingAffinityEvidence.md)

---

### spill?

> `optional` **spill?**: [`ProxyAccountRoutingSpillEvidence`](ProxyAccountRoutingSpillEvidence.md)
