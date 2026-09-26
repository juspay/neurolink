[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AdditionalMemoryUser

# Type Alias: AdditionalMemoryUser

> **AdditionalMemoryUser** = `object`

Defined in: [types/generate.ts:870](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L870)

Represents an additional user whose memory should be included in a generate/stream call.
Allows per-user prompt overrides for different memory condensation strategies
(e.g. personal preferences vs org-level policies).

## Properties

### userId

> **userId**: `string`

Defined in: [types/generate.ts:872](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L872)

The user/owner ID to retrieve or store memory for.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/generate.ts:878](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L878)

Human-readable label used in the formatted memory context.
E.g. "Organization Policy", "Team Context", "User Preferences".
If not provided, defaults to userId.

---

### read?

> `optional` **read?**: `boolean`

Defined in: [types/generate.ts:880](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L880)

Whether to read this user's memory and include in context. Defaults to true.

---

### write?

> `optional` **write?**: `boolean`

Defined in: [types/generate.ts:882](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L882)

Whether to write conversation into this user's memory. Defaults to true.

---

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/generate.ts:884](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L884)

Custom condensation prompt for this user. Overrides the default Hippocampus prompt.

---

### maxWords?

> `optional` **maxWords?**: `number`

Defined in: [types/generate.ts:886](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L886)

Max words for this user's condensed memory. Overrides the default maxWords.
