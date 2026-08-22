[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AdditionalMemoryUser

# Type Alias: AdditionalMemoryUser

> **AdditionalMemoryUser** = `object`

Defined in: [types/generate.ts:814](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/generate.ts#L814)

Represents an additional user whose memory should be included in a generate/stream call.
Allows per-user prompt overrides for different memory condensation strategies
(e.g. personal preferences vs org-level policies).

## Properties

### userId

> **userId**: `string`

Defined in: [types/generate.ts:816](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/generate.ts#L816)

The user/owner ID to retrieve or store memory for.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/generate.ts:822](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/generate.ts#L822)

Human-readable label used in the formatted memory context.
E.g. "Organization Policy", "Team Context", "User Preferences".
If not provided, defaults to userId.

---

### read?

> `optional` **read?**: `boolean`

Defined in: [types/generate.ts:824](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/generate.ts#L824)

Whether to read this user's memory and include in context. Defaults to true.

---

### write?

> `optional` **write?**: `boolean`

Defined in: [types/generate.ts:826](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/generate.ts#L826)

Whether to write conversation into this user's memory. Defaults to true.

---

### prompt?

> `optional` **prompt?**: `string`

Defined in: [types/generate.ts:828](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/generate.ts#L828)

Custom condensation prompt for this user. Overrides the default Hippocampus prompt.

---

### maxWords?

> `optional` **maxWords?**: `number`

Defined in: [types/generate.ts:830](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/generate.ts#L830)

Max words for this user's condensed memory. Overrides the default maxWords.
