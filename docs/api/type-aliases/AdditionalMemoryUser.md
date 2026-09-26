[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AdditionalMemoryUser

# Type Alias: AdditionalMemoryUser

> **AdditionalMemoryUser** = `object`

Defined in: [types/generate.ts:907](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L907)

Represents an additional user whose memory should be included in a generate/stream call.
Allows per-user prompt overrides for different memory condensation strategies
(e.g. personal preferences vs org-level policies).

## Properties

### userId

> **userId**: `string`

Defined in: [types/generate.ts:909](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L909)

The user/owner ID to retrieve or store memory for.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/generate.ts:915](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L915)

Human-readable label used in the formatted memory context.
E.g. "Organization Policy", "Team Context", "User Preferences".
If not provided, defaults to userId.

---

### read?

> `optional` **read?**: `boolean`

Defined in: [types/generate.ts:917](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L917)

Whether to read this user's memory and include in context. Defaults to true.

---

### write?

> `optional` **write?**: `boolean`

Defined in: [types/generate.ts:919](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L919)

Whether to write conversation into this user's memory. Defaults to true.

---

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/generate.ts:921](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L921)

Custom condensation prompt for this user. Overrides the default Hippocampus prompt.

---

### maxWords?

> `optional` **maxWords?**: `number`

Defined in: [types/generate.ts:923](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L923)

Max words for this user's condensed memory. Overrides the default maxWords.
