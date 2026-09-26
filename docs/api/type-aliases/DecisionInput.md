[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionInput

# Type Alias: DecisionInput

> **DecisionInput** = `string` \| `number` \| `boolean` \| readonly `DecisionInput`[] \| \{\[`key`: `string`\]: `DecisionInput`; \}

Anything a decision model accepts as free-form content. `state` may be a
plain string or structured JSON (chat logs, records); `instructions` and
`criteria` values likewise.
