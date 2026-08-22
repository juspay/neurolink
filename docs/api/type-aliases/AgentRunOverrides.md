[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunOverrides

# Type Alias: AgentRunOverrides

> **AgentRunOverrides** = `object`

Defined in: [types/isolatedAgent.ts:140](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L140)

Per-run overrides for an isolated agent run (internal-caller knobs).

## Properties

### turnTimeoutMs?

> `optional` **turnTimeoutMs?**: `number`

Defined in: [types/isolatedAgent.ts:142](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L142)

Wall-clock cap for the research pass (ms).

---

### stallTimeoutMs?

> `optional` **stallTimeoutMs?**: `number`

Defined in: [types/isolatedAgent.ts:144](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L144)

Stall watchdog for the research pass (ms).

---

### wrapupTimeLeadMs?

> `optional` **wrapupTimeLeadMs?**: `number`

Defined in: [types/isolatedAgent.ts:146](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L146)

Wrap-up lead for the research pass (ms).

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Defined in: [types/isolatedAgent.ts:148](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L148)

Max agentic steps for the research pass.

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/isolatedAgent.ts:150](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L150)

Max output tokens per model call.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/isolatedAgent.ts:152](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L152)

Model override (wins over the definition).

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/isolatedAgent.ts:154](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L154)

Provider override (wins over the definition).
