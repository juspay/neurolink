[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoopGuardPolicy

# Type Alias: LoopGuardPolicy

> **LoopGuardPolicy** = `object`

Defined in: [types/context.ts:923](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L923)

Tuning for planLoopGuardReclaim.

## Properties

### availableInputTokens

> **availableInputTokens**: `number`

Defined in: [types/context.ts:924](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L924)

---

### fixedOverheadTokens

> **fixedOverheadTokens**: `number`

Defined in: [types/context.ts:926](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L926)

System prompt + tool definitions — rides outside the message array.

---

### thresholdRatio?

> `optional` **thresholdRatio?**: `number`

Defined in: [types/context.ts:928](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L928)

Fraction of the window at which the guard fires.

---

### lowWaterRatio?

> `optional` **lowWaterRatio?**: `number`

Defined in: [types/context.ts:930](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L930)

Fraction of the window the guard reclaims down to once it fires.

---

### protectedTailCount?

> `optional` **protectedTailCount?**: `number`

Defined in: [types/context.ts:932](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L932)

Newest entries the guard must never modify.

---

### calibration?

> `optional` **calibration?**: `number`

Defined in: [types/context.ts:934](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L934)

Observed/estimated token ratio, used to tighten both marks.
