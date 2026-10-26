[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeSnapshotBody

# Type Alias: ClaudeSnapshotBody

> **ClaudeSnapshotBody** = `object`

Identity tuple captured from a genuine Claude Code client request body.

Deliberately carries no prompt text. An earlier shape persisted the client's
"agent block" `system` text and replayed it as the system prompt of every
later non-Claude-Code request on the account, so one hostile request could
plant instructions into everyone else's sessions. The agent block is now a
compiled-in constant; `billingHeader` is stored only in its normalised
two-field form.

## Properties

### metadataUserId?

> `optional` **metadataUserId?**: `string`

---

### billingHeader?

> `optional` **billingHeader?**: `string`

---

### sessionId?

> `optional` **sessionId?**: `string`
