[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AdditionalMemoryUser

# Type Alias: AdditionalMemoryUser

> **AdditionalMemoryUser** = `object`

Defined in: [types/generate.ts:568](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L568)

Represents an additional user whose memory should be included in a generate/stream call.
Allows per-user prompt overrides for different memory condensation strategies
(e.g. personal preferences vs org-level policies).

## Properties

### userId

> **userId**: `string`

Defined in: [types/generate.ts:570](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L570)

The user/owner ID to retrieve or store memory for.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/generate.ts:576](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L576)

Human-readable label used in the formatted memory context.
E.g. "Organization Policy", "Team Context", "User Preferences".
If not provided, defaults to userId.

---

### read?

> `optional` **read?**: `boolean`

Defined in: [types/generate.ts:578](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L578)

Whether to read this user's memory and include in context. Defaults to true.

---

### write?

> `optional` **write?**: `boolean`

Defined in: [types/generate.ts:580](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L580)

Whether to write conversation into this user's memory. Defaults to true.

---

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/generate.ts:582](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L582)

Custom condensation prompt for this user. Overrides the default Hippocampus prompt.

---

### maxWords?

> `optional` **maxWords?**: `number`

Defined in: [types/generate.ts:584](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L584)

Max words for this user's condensed memory. Overrides the default maxWords.
