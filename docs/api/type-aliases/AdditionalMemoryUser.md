[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AdditionalMemoryUser

# Type Alias: AdditionalMemoryUser

> **AdditionalMemoryUser** = `object`

Defined in: [types/generate.ts:900](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L900)

Represents an additional user whose memory should be included in a generate/stream call.
Allows per-user prompt overrides for different memory condensation strategies
(e.g. personal preferences vs org-level policies).

## Properties

### userId

> **userId**: `string`

Defined in: [types/generate.ts:902](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L902)

The user/owner ID to retrieve or store memory for.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/generate.ts:908](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L908)

Human-readable label used in the formatted memory context.
E.g. "Organization Policy", "Team Context", "User Preferences".
If not provided, defaults to userId.

---

### read?

> `optional` **read?**: `boolean`

Defined in: [types/generate.ts:910](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L910)

Whether to read this user's memory and include in context. Defaults to true.

---

### write?

> `optional` **write?**: `boolean`

Defined in: [types/generate.ts:912](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L912)

Whether to write conversation into this user's memory. Defaults to true.

---

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/generate.ts:914](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L914)

Custom condensation prompt for this user. Overrides the default Hippocampus prompt.

---

### maxWords?

> `optional` **maxWords?**: `number`

Defined in: [types/generate.ts:916](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L916)

Max words for this user's condensed memory. Overrides the default maxWords.
