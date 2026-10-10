[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConversationSeedOptions

# Type Alias: ConversationSeedOptions

> **ConversationSeedOptions** = `object`

Options for `NeuroLink.getConversationSeed`.

## Properties

### sessionId

> **sessionId**: `string`

---

### userId

> **userId**: `string`

---

### maxTurns?

> `optional` **maxTurns?**: `number`

Most recent user/assistant exchanges to return (default 10).

---

### maxChars?

> `optional` **maxChars?**: `number`

Cap on the total characters returned; the oldest messages are dropped first (default 6000).
