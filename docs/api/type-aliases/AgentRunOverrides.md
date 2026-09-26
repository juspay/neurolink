[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunOverrides

# Type Alias: AgentRunOverrides

> **AgentRunOverrides** = `object`

Defined in: [types/isolatedAgent.ts:149](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L149)

Per-run overrides for an isolated agent run (internal-caller knobs).

## Properties

### turnTimeoutMs?

> `optional` **turnTimeoutMs?**: `number`

Defined in: [types/isolatedAgent.ts:151](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L151)

Wall-clock cap for the research pass (ms).

---

### stallTimeoutMs?

> `optional` **stallTimeoutMs?**: `number`

Defined in: [types/isolatedAgent.ts:153](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L153)

Stall watchdog for the research pass (ms).

---

### wrapupTimeLeadMs?

> `optional` **wrapupTimeLeadMs?**: `number`

Defined in: [types/isolatedAgent.ts:155](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L155)

Wrap-up lead for the research pass (ms).

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Defined in: [types/isolatedAgent.ts:157](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L157)

Max agentic steps for the research pass.

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/isolatedAgent.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L159)

Max output tokens per model call.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/isolatedAgent.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L161)

Model override (wins over the definition).

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/isolatedAgent.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L163)

Provider override (wins over the definition).
