[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountRoutingDecision

# Type Alias: ProxyAccountRoutingDecision

> **ProxyAccountRoutingDecision** = `object`

Defined in: [types/proxy.ts:603](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L603)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:604](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L604)

---

### evaluatedAt

> **evaluatedAt**: `string`

Defined in: [types/proxy.ts:605](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L605)

---

### strategy

> **strategy**: [`ProxyAccountRoutingStrategy`](ProxyAccountRoutingStrategy.md)

Defined in: [types/proxy.ts:606](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L606)

---

### mode

> **mode**: [`ProxyAccountRoutingMode`](ProxyAccountRoutingMode.md)

Defined in: [types/proxy.ts:607](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L607)

---

### selectionReason

> **selectionReason**: [`ProxyAccountRoutingReason`](ProxyAccountRoutingReason.md)

Defined in: [types/proxy.ts:608](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L608)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:609](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L609)

---

### quotaInputsUsed

> **quotaInputsUsed**: `boolean`

Defined in: [types/proxy.ts:610](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L610)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:611](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L611)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:612](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L612)

---

### configuredPrimaryAccount

> **configuredPrimaryAccount**: `string` \| `null`

Defined in: [types/proxy.ts:613](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L613)

---

### configuredPrimaryMatched

> **configuredPrimaryMatched**: `boolean`

Defined in: [types/proxy.ts:614](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L614)

---

### rotationOffset

> **rotationOffset**: `number`

Defined in: [types/proxy.ts:615](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L615)

---

### initialAccount

> **initialAccount**: `string`

Defined in: [types/proxy.ts:616](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L616)

---

### candidates

> **candidates**: [`ProxyAccountRoutingCandidate`](ProxyAccountRoutingCandidate.md)[]

Defined in: [types/proxy.ts:617](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L617)
