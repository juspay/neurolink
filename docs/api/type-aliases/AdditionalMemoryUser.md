[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AdditionalMemoryUser

# Type Alias: AdditionalMemoryUser

> **AdditionalMemoryUser** = `object`

Represents an additional user whose memory should be included in a generate/stream call.
Allows per-user prompt overrides for different memory condensation strategies
(e.g. personal preferences vs org-level policies).

## Properties

### userId

> **userId**: `string`

The user/owner ID to retrieve or store memory for.

---

### label?

> `optional` **label?**: `string`

Human-readable label used in the formatted memory context.
E.g. "Organization Policy", "Team Context", "User Preferences".
If not provided, defaults to userId.

---

### read?

> `optional` **read?**: `boolean`

Whether to read this user's memory and include in context. Defaults to true.

---

### write?

> `optional` **write?**: `boolean`

Whether to write conversation into this user's memory. Defaults to true.

---

### prompt?

> `optional` **prompt?**: `string`

Custom condensation prompt for this user. Overrides the default Hippocampus prompt.

---

### maxWords?

> `optional` **maxWords?**: `number`

Max words for this user's condensed memory. Overrides the default maxWords.
