[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunOverrides

# Type Alias: AgentRunOverrides

> **AgentRunOverrides** = `object`

Per-run overrides for an isolated agent run (internal-caller knobs).

## Properties

### turnTimeoutMs?

> `optional` **turnTimeoutMs?**: `number`

Wall-clock cap for the research pass (ms).

---

### stallTimeoutMs?

> `optional` **stallTimeoutMs?**: `number`

Stall watchdog for the research pass (ms).

---

### wrapupTimeLeadMs?

> `optional` **wrapupTimeLeadMs?**: `number`

Wrap-up lead for the research pass (ms).

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Max agentic steps for the research pass.

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Max output tokens per model call.

---

### model?

> `optional` **model?**: `string`

Model override (wins over the definition).

---

### provider?

> `optional` **provider?**: `string`

Provider override (wins over the definition).
