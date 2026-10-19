[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionLimitsReading

# Type Alias: DecisionLimitsReading

> **DecisionLimitsReading** = `object`

A provider's decision limits resolved for one model — the figure the
pre-flight check compares against, flattened from a descriptor's
`decisionLimits` with the per-model override applied.

Returned by `NeuroLink.decisionLimits()` so a host extending NeuroLink's
questions (see [DecisionHooks](DecisionHooks.md)) can size its additions before the
call, instead of discovering the cap when the whole request is refused.

## Properties

### provider

> **provider**: `string`

---

### model

> **model**: `string`

---

### maxStateTokens

> **maxStateTokens**: `number`

---

### maxQuestions?

> `optional` **maxQuestions?**: `number`

Absent when the provider caps a request by tokens (or bytes) rather
than by question count — TypeSafe; `Infinity` is never used.

---

### questionTypes?

> `optional` **questionTypes?**: readonly [`DecisionQuestionType`](DecisionQuestionType.md)[]

Present only when the descriptor declares it; absent means `boolean`, `choice` and `score`.

---

### maxScoreLevels?

> `optional` **maxScoreLevels?**: `number`

Most levels one `score` question may have; absent means no local cap.

---

### maxChoiceOptions?

> `optional` **maxChoiceOptions?**: `number`

Most options one `choice` question may have; absent means no local cap.

---

### nonAsciiTokensPerChar?

> `optional` **nonAsciiTokensPerChar?**: `number`

---

### digitTokensPerChar?

> `optional` **digitTokensPerChar?**: `number`

Tokens charged per ASCII digit; see [DecisionLimits.digitTokensPerChar](DecisionLimits.md#digittokensperchar).

---

### symbolTokensPerChar?

> `optional` **symbolTokensPerChar?**: `number`

Tokens charged per ASCII punctuation/symbol; see [DecisionLimits.symbolTokensPerChar](DecisionLimits.md#symboltokensperchar).

---

### astralTokensPerChar?

> `optional` **astralTokensPerChar?**: `number`

Tokens charged per astral character; see [DecisionLimits.astralTokensPerChar](DecisionLimits.md#astraltokensperchar).

---

### media?

> `optional` **media?**: [`DecisionMediaLimits`](DecisionMediaLimits.md)

What the provider accepts besides text; absent means text only.

---

### enforcedLocally

> **enforcedLocally**: `boolean`

Whether NeuroLink itself refuses an over-limit request before any network
call (Laya), or merely reports the server's ceiling (TypeSafe).
