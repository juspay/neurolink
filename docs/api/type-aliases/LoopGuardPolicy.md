[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoopGuardPolicy

# Type Alias: LoopGuardPolicy

> **LoopGuardPolicy** = `object`

Defined in: [types/context.ts:946](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L946)

Tuning for planLoopGuardReclaim.

## Properties

### availableInputTokens

> **availableInputTokens**: `number`

Defined in: [types/context.ts:947](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L947)

---

### fixedOverheadTokens

> **fixedOverheadTokens**: `number`

Defined in: [types/context.ts:949](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L949)

System prompt + tool definitions — rides outside the message array.

---

### thresholdRatio?

> `optional` **thresholdRatio?**: `number`

Defined in: [types/context.ts:951](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L951)

Fraction of the window at which the guard fires.

---

### lowWaterRatio?

> `optional` **lowWaterRatio?**: `number`

Defined in: [types/context.ts:953](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L953)

Fraction of the window the guard reclaims down to once it fires.

---

### protectedTailCount?

> `optional` **protectedTailCount?**: `number`

Defined in: [types/context.ts:955](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L955)

Newest entries the guard must never modify.

---

### calibration?

> `optional` **calibration?**: `number`

Defined in: [types/context.ts:957](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L957)

Observed/estimated token ratio, used to tighten both marks.
