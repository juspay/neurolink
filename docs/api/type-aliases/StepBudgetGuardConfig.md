[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepBudgetGuardConfig

# Type Alias: StepBudgetGuardConfig

> **StepBudgetGuardConfig** = `object`

Defined in: [types/context.ts:665](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L665)

Configuration for the per-step context budget guard that compacts the
AI-SDK tool loop's messages before they overflow the model window
(context/stepBudgetGuard.ts).

## Properties

### provider

> **provider**: `string`

Defined in: [types/context.ts:666](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L666)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/context.ts:667](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L667)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/context.ts:669](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L669)

The caller's requested output budget (reserved out of the window).

---

### fixedOverheadTokens?

> `optional` **fixedOverheadTokens?**: `number`

Defined in: [types/context.ts:671](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L671)

Static token cost of the hoisted system prompt + tool definitions.

---

### getFixedOverheadTokens?

> `optional` **getFixedOverheadTokens?**: () => `number`

Defined in: [types/context.ts:678](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L678)

Dynamic overhead resolver, re-evaluated on EVERY guard invocation. Takes
precedence over `fixedOverheadTokens`. Use when the tool set can grow
mid-loop (search_tools hydration) so newly added definitions count toward
the budget.

#### Returns

`number`

---

### thresholdRatio?

> `optional` **thresholdRatio?**: `number`

Defined in: [types/context.ts:680](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L680)

Override the trigger ratio; defaults to DEFAULT_CONTEXT_GUARD_RATIO.
